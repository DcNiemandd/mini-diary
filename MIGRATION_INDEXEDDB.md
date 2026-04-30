# Migration Plan: localStorage → IndexedDB with Infinite Scroll

> **Prerequisite:** Complete `MIGRATION.md` first. This migration builds on the TanStack Query architecture and the `entriesService` service layer established there.
>
> **Goal:** Replace both localStorage stores (`state-entries-data` and `state-auth-user`) with IndexedDB. Entries become row-per-entry with both date and content encrypted, paginated newest-to-oldest. The auth user record moves into a dedicated `users` table; entries reference it via a `userId` foreign key (= the encoded `databaseKey`). Single-user for now, but the schema supports multi-user without further migration. Zero plaintext metadata in entries.

---

## Why Not TanStack DB?

`@tanstack/db` is a reactive in-memory collection store designed for structured, queryable, plaintext data with optimistic mutations. It is not a good fit here because:

- Our data is fully encrypted — TanStack DB cannot index or query encrypted fields
- We need custom IndexedDB cursor logic on encrypted records
- The persistence adapter story for TanStack DB is still immature

**Decision:** Use [`idb`](https://github.com/jakearchibald/idb) (a 1 KB Promise wrapper over IndexedDB) with TanStack Query's `useInfiniteQuery`.

---

## Ordering Strategy

All metadata is encrypted. The only plaintext field is `id` — an autoIncrement integer assigned by IndexedDB on insert.

**Pagination cursor = `id`.** Fetching `id DESC` gives newest-first order because:
- During the one-time migration, old entries are inserted in ascending date order, so `id` 1 = oldest
- Going forward, users write today's entry today, so insertion order ≈ date order

**Backdated entries** (writing today about last week) will appear in insertion order, not date order. This is the privacy tradeoff: no plaintext sort key means no correct out-of-order placement.

### Date-Based Lookup (Search / Jump-to-Date)

Since dates are encrypted, finding a specific date requires decrypting records. The approach is **binary search by `id`**:

1. Pick a midpoint `id = Math.floor((lo + hi) / 2)`
2. Fetch that record by primary key, decrypt its date
3. Compare — if too new, search lower half; if too old, search upper half
4. Repeat until found or confirmed absent

This leaks nothing — only `id` values are read, which are already visible as sequential integers.

---

## Data Model

### Current (localStorage)

Two separate keys — entries blob (date is plaintext as a JSON object key) and the auth user blob:

```json
// key: "state-entries-data"
{
  "2024-03-15": "<encrypted content>",
  "2024-03-16": "<encrypted content>"
}

// key: "state-auth-user"
{
  "databaseKey": "<encoded databaseKey>",
  "salt": "<password salt>",
  "hmac": "<DB key hmac>"
}
```

### Target (IndexedDB)

Database: `mini-diary` · Two object stores: `users` and `entries`.

#### `users` store

Primary key = `databaseKey` (the **encoded** key — already opaque, already the persistent identifier of a user). One record per account.

| Field | Type | Plaintext? | Purpose |
|---|---|---|---|
| `databaseKey` | `string` | ✅ opaque (encoded) | Primary key + `userId` referenced from entries |
| `salt` | `string` | ✅ yes | Password key salt |
| `hmac` | `string` | ✅ yes | DB key HMAC for verification |

```ts
interface UserRecord {
  databaseKey: string; // encoded; primary key
  salt: string;
  hmac: string;
}
```

#### `entries` store

| Field | Type | Plaintext? | Purpose |
|---|---|---|---|
| `id` | `number` (autoIncrement) | ✅ yes | Primary key + pagination cursor |
| `userId` | `string` | ✅ opaque (encoded) | FK → `users.databaseKey` |
| `encryptedDate` | `string` | ❌ encrypted | The ISO date string |
| `encryptedContent` | `string` | ❌ encrypted | The diary entry text |

```ts
interface EntryRecord {
  id?: number;
  userId: string;
  encryptedDate: string;
  encryptedContent: string;
}
```

**Index:** compound `[userId, id]` on `entries`. Required so cursor pagination can iterate one user's records in `id DESC` order without scanning others. `userId` alone is opaque to outsiders (encoded blob), so indexing it leaks nothing beyond "how many users exist on this device".

No indexes on encrypted fields. No plaintext date. No sort key.

> **FK note:** IndexedDB does not enforce foreign keys. `entries.userId` is a logical FK only — integrity is maintained by the service layer (every write supplies the current user's id; `removeAccount` deletes the user record and all matching entries together).

---

## Step 1 — Install `idb`

```bash
npm install idb
```

---

## Step 2 — Create the Database Module

Create `src/services/entriesDb.ts`:

```ts
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'mini-diary';
const DB_VERSION = 1;
export const ENTRIES_STORE = 'entries';
export const USERS_STORE = 'users';

export interface UserRecord {
  databaseKey: string; // encoded; primary key
  salt: string;
  hmac: string;
}

export interface EntryRecord {
  id?: number;
  userId: string; // FK → users.databaseKey
  encryptedDate: string;
  encryptedContent: string;
}

let _db: Promise<IDBPDatabase> | null = null;

export const getDb = (): Promise<IDBPDatabase> => {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // users: keyed by encoded databaseKey
        db.createObjectStore(USERS_STORE, { keyPath: 'databaseKey' });

        // entries: autoIncrement id + compound index for per-user cursor pagination
        const entries = db.createObjectStore(ENTRIES_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        entries.createIndex('userId_id', ['userId', 'id']);
      },
    });
  }
  return _db;
};
```

---

## Step 3 — Create `usersService.ts`

Create `src/services/usersService.ts`. Thin wrapper for the `users` store.

```ts
import { getDb, USERS_STORE, ENTRIES_STORE, type UserRecord } from './entriesDb';

/** Returns the single user record if any. Future-proof for multi-user via getAll(). */
export const getCurrentUser = async (): Promise<UserRecord | null> => {
  const db = await getDb();
  const all = await db.getAll(USERS_STORE);
  return all[0] ?? null;
};

export const putUser = async (user: UserRecord): Promise<void> => {
  const db = await getDb();
  await db.put(USERS_STORE, user);
};

/** Delete a user record AND every entry referencing it, in a single transaction. */
export const deleteUserAndEntries = async (databaseKey: string): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction([USERS_STORE, ENTRIES_STORE], 'readwrite');

  await tx.objectStore(USERS_STORE).delete(databaseKey);

  const idx = tx.objectStore(ENTRIES_STORE).index('userId_id');
  const range = IDBKeyRange.bound([databaseKey, -Infinity], [databaseKey, Infinity]);
  let cursor = await idx.openCursor(range);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
};
```

---

## Step 4 — Rewrite `entriesService.ts`

Replace `src/services/entriesService.ts` entirely.

Every read and write is now scoped by `userId` (= the encoded `databaseKey` of the current user). The service exposes **two separate write operations** — `createEntry` (insert, returns the new `id`) and `updateEntry` (update a known record by `id`). This is necessary because without a plaintext date index there is no way for the service layer to check whether a record for a given day already exists. The hook is responsible for tracking whether today's entry already has an `id`.

```ts
import { DateTime } from 'luxon';
import { getDb, ENTRIES_STORE, type EntryRecord } from './entriesDb';

export interface Entry {
  date: DateTime;
  content: string;
}

export interface EntriesPage {
  entries: (Entry & { id: number })[]; // id is exposed so the hook can track it
  nextCursor: number | null;           // id of the oldest entry in this page, or null if no more
}

const PAGE_SIZE = 10;

/** Fetch one page of a user's entries, newest first (id DESC), starting before `cursor` */
export const fetchEntriesPage = async (
  userId: string,
  decryptData: (s: string) => Promise<string>,
  cursor: number | null // null = start from the newest
): Promise<EntriesPage> => {
  const db = await getDb();
  const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userId_id');

  // Compound key range: all rows for this user, optionally bounded above by cursor
  const upperId = cursor !== null ? cursor - 1 : Infinity;
  const range = IDBKeyRange.bound(
    [userId, -Infinity],
    [userId, upperId]
  );

  const records: EntryRecord[] = [];
  let idbCursor = await idx.openCursor(range, 'prev'); // 'prev' = descending id

  while (idbCursor && records.length < PAGE_SIZE) {
    records.push(idbCursor.value);
    idbCursor = await idbCursor.continue();
  }

  const entries = await Promise.all(
    records.map(async (r) => ({
      id: r.id!,
      date: DateTime.fromISO(await decryptData(r.encryptedDate)),
      content: await decryptData(r.encryptedContent),
    }))
  );

  return {
    entries,
    nextCursor: records.length === PAGE_SIZE
      ? records[records.length - 1].id!
      : null,
  };
};

/** Fetch a single record by id and decrypt it — used for binary search / jump-to-date */
export const fetchEntryById = async (
  userId: string,
  id: number,
  decryptData: (s: string) => Promise<string>
): Promise<(Entry & { id: number }) | null> => {
  const db = await getDb();
  const record: EntryRecord | undefined = await db.get(ENTRIES_STORE, id);
  if (!record || record.userId !== userId) return null;
  return {
    id: record.id!,
    date: DateTime.fromISO(await decryptData(record.encryptedDate)),
    content: await decryptData(record.encryptedContent),
  };
};

/** Get the min and max id for a user — needed to initialise a binary search */
export const getIdBounds = async (
  userId: string
): Promise<{ min: number; max: number } | null> => {
  const db = await getDb();
  const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userId_id');
  const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
  const first = await idx.openCursor(range, 'next');
  const last = await idx.openCursor(range, 'prev');
  if (!first || !last) return null;
  return { min: first.value.id!, max: last.value.id! };
};

/** Insert a new entry for a user. Returns the assigned id. */
export const createEntry = async (
  userId: string,
  entry: Entry,
  encryptData: (s: string) => Promise<string>
): Promise<number> => {
  const db = await getDb();
  const encryptedDate = await encryptData(entry.date.toISODate()!);
  const encryptedContent = await encryptData(entry.content);
  const id = await db.add(ENTRIES_STORE, {
    userId,
    encryptedDate,
    encryptedContent,
  });
  return id as number;
};

/** Update an existing entry in place by its known id. */
export const updateEntry = async (
  userId: string,
  id: number,
  entry: Entry,
  encryptData: (s: string) => Promise<string>
): Promise<void> => {
  const db = await getDb();
  const encryptedDate = await encryptData(entry.date.toISODate()!);
  const encryptedContent = await encryptData(entry.content);
  await db.put(ENTRIES_STORE, { id, userId, encryptedDate, encryptedContent });
};
```

`clearEntries` is removed — account removal now goes through `deleteUserAndEntries` in `usersService.ts`, which deletes the user row and its entries atomically.

---

## Step 5 — One-Time Migration from localStorage

Create `src/services/migrateFromLocalStorage.ts`. Two phases:

1. **User migration** — runs once during app bootstrap, before the password prompt. Moves `state-auth-user` → `users` store. Synchronous-feeling because there's no decryption involved (everything in `state-auth-user` is already opaque/plaintext metadata).
2. **Entries migration** — runs once at the end of a successful `tryToLogin`, before the first `useInfiniteQuery` fires. Re-encrypts the date (previously the plaintext JSON key) and stamps each row with the current `userId`.

```ts
import { getDb, ENTRIES_STORE, type UserRecord } from './entriesDb';
import { getCurrentUser, putUser } from './usersService';

const LS_AUTH_KEY = 'state-auth-user';
const LS_ENTRIES_KEY = 'state-entries-data';
const USER_MIGRATION_FLAG = 'auth-migrated-to-idb-v1';
const ENTRIES_MIGRATION_FLAG = 'entries-migrated-to-idb-v1';

/**
 * Move state-auth-user from localStorage into the users store.
 * Idempotent. Safe to call on every app start.
 */
export const migrateLocalStorageUser = async (): Promise<UserRecord | null> => {
  if (localStorage.getItem(USER_MIGRATION_FLAG)) {
    return getCurrentUser();
  }

  const raw = localStorage.getItem(LS_AUTH_KEY);
  if (!raw) {
    localStorage.setItem(USER_MIGRATION_FLAG, 'true');
    return null;
  }

  const parsed = JSON.parse(raw) as UserRecord;
  await putUser(parsed);
  localStorage.setItem(USER_MIGRATION_FLAG, 'true');
  // Keep the original localStorage blob until confirmed stable.
  return parsed;
};

/**
 * Re-encrypt the date (previously stored as a plaintext JSON key) and write
 * each old entry as an individual IndexedDB record stamped with `userId`.
 *
 * Records are inserted in ascending date order so that id order matches date
 * order — this is important for correct pagination by id DESC.
 *
 * The content was already encrypted with the same key and is reused as-is.
 */
export const migrateLocalStorageEntries = async (
  userId: string,
  encryptData: (s: string) => Promise<string>
): Promise<void> => {
  if (localStorage.getItem(ENTRIES_MIGRATION_FLAG)) return;

  const raw = localStorage.getItem(LS_ENTRIES_KEY);
  if (!raw) {
    localStorage.setItem(ENTRIES_MIGRATION_FLAG, 'true');
    return;
  }

  const blob: Record<string, string> = JSON.parse(raw);
  const sorted = Object.entries(blob).sort(([a], [b]) => a.localeCompare(b));

  const db = await getDb();
  const tx = db.transaction(ENTRIES_STORE, 'readwrite');

  for (const [dateStr, encryptedContent] of sorted) {
    const encryptedDate = await encryptData(dateStr);
    await tx.store.add({ userId, encryptedDate, encryptedContent });
  }

  await tx.done;
  localStorage.setItem(ENTRIES_MIGRATION_FLAG, 'true');
  // Keep the original localStorage blob until confirmed stable.
};
```

`migrateLocalStorageUser()` runs once at bootstrap (e.g. inside `useAuth`'s init effect, before deciding `isUser`). `migrateLocalStorageEntries(userId, encryptData)` runs after `tryToLogin` succeeds.

---

## Step 6 — Replace `useEntriesQuery` with `useInfiniteEntriesQuery`

Delete `src/hooks/useEntriesQuery.ts`. Create `src/hooks/useInfiniteEntriesQuery.ts`.

The hook needs the current `userId` (= encoded `databaseKey`) to scope reads/writes — exposed from `AuthContext` as `userId`. It also tracks `todayEntryId` — the IndexedDB `id` of the current day's record if it has already been written this session. This lets save operations call `updateEntry` instead of `createEntry` without any plaintext date lookup.

```ts
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useContext, useRef } from 'react';
import { DateTime } from 'luxon';
import { AuthContext } from '../contexts/authContext/authContext';
import {
  fetchEntriesPage,
  createEntry,
  updateEntry,
  type Entry,
} from '../services/entriesService';
import { queryKeys } from '../queryKeys';

export const useInfiniteEntriesQuery = () => {
  const { decryptData, encryptData, userId } = useContext(AuthContext);
  const queryClient = useQueryClient();

  // Tracks the id of today's entry once it exists in IndexedDB.
  // A ref (not state) because changing it must not trigger a re-render.
  const todayEntryIdRef = useRef<number | null>(null);

  const query = useInfiniteQuery({
    queryKey: queryKeys.entries(userId!),
    queryFn: ({ pageParam }) => fetchEntriesPage(userId!, decryptData, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userId),
    staleTime: Infinity,
  });

  // When the first page loads, check if today's entry is already present
  // and record its id for subsequent saves.
  const firstPage = query.data?.pages[0];
  if (firstPage && todayEntryIdRef.current === null) {
    const todayISO = DateTime.now().toISODate();
    const todayEntry = firstPage.entries.find(
      (e) => e.date.toISODate() === todayISO
    );
    if (todayEntry) {
      todayEntryIdRef.current = todayEntry.id;
    }
  }

  const mutation = useMutation({
    mutationFn: async (entry: Entry) => {
      if (todayEntryIdRef.current !== null) {
        await updateEntry(userId!, todayEntryIdRef.current, entry, encryptData);
      } else {
        const newId = await createEntry(userId!, entry, encryptData);
        todayEntryIdRef.current = newId;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries(userId!) });
    },
  });

  return {
    entries: query.data?.pages.flatMap((p) => p.entries) ?? [],
    isPending: query.isPending,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    saveEntry: mutation.mutate,
    isSaving: mutation.isPending,
  };
};
```

---

## Step 7 — Rewrite `useAuth.ts` against the `users` store

`useAuth` no longer uses `useLocalStorage`. The user record now lives in IndexedDB, which means initial load is **async** — there's a brief moment after mount before we know whether an account exists. Add an `isInitializing` flag so the UI can render a splash/loader instead of flashing the new-account screen.

Expose the encoded `databaseKey` as `userId` on the context so the entries layer can scope queries by it. The plaintext in-memory `databaseKey` (used for crypto) stays internal.

Sketch:

```ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MyCrypto } from '../utils/crypto';
import {
  getCurrentUser,
  putUser,
  deleteUserAndEntries,
} from '../services/usersService';
import {
  migrateLocalStorageUser,
  migrateLocalStorageEntries,
} from '../services/migrateFromLocalStorage';
import type { UserRecord } from '../services/entriesDb';

export interface AuthState {
  isInitializing: boolean;
  isUser: boolean;
  isLoggedIn: boolean;
  userId: string | null;          // encoded databaseKey — IDB FK
  tryToLogin: (password: string) => Promise<boolean>;
  logout: () => void;
  encryptData: (data: string) => Promise<string>;
  decryptData: (gibberish: string) => Promise<string>;
  removeAccount: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [userAuth, setUserAuth] = useState<UserRecord | null>(null);
  const [databaseKey, setDatabaseKey] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const queryClient = useQueryClient();

  // One-shot init: migrate localStorage user if needed, then load from IDB.
  useEffect(() => {
    (async () => {
      await migrateLocalStorageUser();
      setUserAuth(await getCurrentUser());
      setIsInitializing(false);
    })();
  }, []);

  const tryToLogin = async (password: string): Promise<boolean> => {
    if (userAuth === null) {
      try {
        const salt = MyCrypto.generaRandomString();
        const encodedPassword = await MyCrypto.encodePassword(password, salt);
        const plainKey = MyCrypto.generaRandomString();
        const encodedDatabaseKey = await MyCrypto.encryptAESGCM(plainKey, encodedPassword);
        const hmac = await MyCrypto.generateHMAC(plainKey, encodedPassword);

        const user: UserRecord = { databaseKey: encodedDatabaseKey, salt, hmac };
        await putUser(user);
        setUserAuth(user);
        setDatabaseKey(plainKey);
        return true;
      } catch (e) {
        console.error(`Error creating new account. ${e}`);
        return false;
      }
    }

    const encodedPassword = await MyCrypto.encodePassword(password, userAuth.salt);
    let plainKey: string;
    try {
      plainKey = await MyCrypto.decryptAESGCM(userAuth.databaseKey, encodedPassword);
    } catch {
      console.error('Cannot decrypt database key');
      return false;
    }

    if ((await MyCrypto.verifyKey(plainKey, userAuth.hmac, encodedPassword)) === false) {
      console.error('HMAC verification failed');
      return false;
    }

    setDatabaseKey(plainKey);

    // First-login-after-migration: move old entries blob into IDB.
    await migrateLocalStorageEntries(
      userAuth.databaseKey,
      (data) => MyCrypto.encryptAESGCM(data, plainKey)
    );

    return true;
  };

  const removeAccount = async () => {
    if (userAuth) await deleteUserAndEntries(userAuth.databaseKey);
    setUserAuth(null);
    setDatabaseKey(null);
    queryClient.clear();
  };

  // logout / encryptData / decryptData unchanged

  return {
    isInitializing,
    isLoggedIn: Boolean(databaseKey),
    isUser: userAuth !== null,
    userId: userAuth?.databaseKey ?? null,
    tryToLogin,
    logout: /* … */,
    removeAccount,
    encryptData: /* … */,
    decryptData: /* … */,
  };
}
```

Update `AuthContext` to expose `userId` and `isInitializing`. Rename `databaseKeyId` → `userId` everywhere it's consumed. Top-level routing should render a loader while `isInitializing` is true.

---

## Step 8 — Infinite Scroll in `NotesLayout`

```tsx
const {
  entries,
  isPending,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteEntriesQuery();

// Button approach — swap the onClick for an IntersectionObserver for true infinite scroll
<button
  onClick={() => fetchNextPage()}
  disabled={!hasNextPage || isFetchingNextPage}
>
  {isFetchingNextPage ? 'Loading…' : hasNextPage ? 'Load older entries' : 'All entries loaded'}
</button>
```

---

## Files to Create / Modify / Delete

| Action | File |
|--------|------|
| **Create** | `src/services/entriesDb.ts` — opens DB, defines `users` + `entries` stores and `[userId, id]` index |
| **Create** | `src/services/usersService.ts` — `getCurrentUser`, `putUser`, `deleteUserAndEntries` |
| **Create** | `src/services/migrateFromLocalStorage.ts` — `migrateLocalStorageUser` + `migrateLocalStorageEntries` |
| **Create** | `src/hooks/useInfiniteEntriesQuery.ts` |
| **Modify** | `src/services/entriesService.ts` — full rewrite; every fn takes `userId`; `clearEntries` removed |
| **Modify** | `src/hooks/useAuth.ts` — drop `useLocalStorage`; load/save user via IDB; expose `userId` + `isInitializing` |
| **Modify** | `src/contexts/authContext/authContext.ts` — `databaseKeyId` → `userId`, add `isInitializing` |
| **Modify** | `src/layouts/notesLayout/notesLayout.tsx` — use `useInfiniteEntriesQuery`, add scroll trigger |
| **Modify** | App root / router — render a loader while `isInitializing` is true |
| **Delete** | `src/hooks/useEntriesQuery.ts` |

---

## Acceptance Criteria

### Users store
- [ ] User record (`databaseKey`, `salt`, `hmac`) is stored in the `users` IndexedDB object store, keyed by `databaseKey`
- [ ] `state-auth-user` localStorage blob is migrated into the `users` store on app bootstrap (before the password prompt)
- [ ] After migration the original `state-auth-user` blob is preserved until a manual cleanup step removes it
- [ ] `useAuth` reads/writes the user via `usersService`, no longer via `useLocalStorage`
- [ ] App root renders a loader while `isInitializing` is true (no flash of new-account screen for returning users)

### Entries store
- [ ] Each diary entry is stored as an individual IndexedDB record with a `userId` FK to `users.databaseKey`
- [ ] Both date and content are encrypted; only `id` (autoIncrement integer) and `userId` (opaque encoded blob) are plaintext
- [ ] Compound index `[userId, id]` exists on `entries` and is used for cursor pagination
- [ ] No indexes exist on encrypted fields
- [ ] Entries load newest-first by `id DESC` within the current user, 10 at a time
- [ ] Scrolling / clicking "load older" fetches the next page without re-decrypting already-loaded entries
- [ ] Saving today's entry updates the existing record (`updateEntry`) rather than inserting a duplicate
- [ ] A new session correctly detects an existing today-entry from the first page and sets `todayEntryIdRef`
- [ ] Existing localStorage entries are migrated on first successful login, stamped with the current `userId`, inserted in ascending date order so `id` order matches date order
- [ ] After migration the original `state-entries-data` blob is preserved until a manual cleanup step removes it
- [ ] Binary search over `id` + `fetchEntryById` can locate a specific date for the current user without reading all records

### Account removal
- [ ] `removeAccount` deletes the user row and every entry referencing it in a single transaction (`deleteUserAndEntries`)
- [ ] After removal both stores are empty for that user; `queryClient` is cleared
