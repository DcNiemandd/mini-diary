# Migration Plan: localStorage → IndexedDB with Infinite Scroll

> **Prerequisite:** Complete `MIGRATION.md` first. This migration builds on the TanStack Query architecture and the `entriesService` service layer established there.
>
> **Goal:** Replace the single-blob `localStorage` entries store with IndexedDB (row-per-entry), encrypt both date and content, and add cursor-based infinite scroll from newest to oldest. Zero plaintext metadata.

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

One JSON blob under a single key — date is plaintext as a JSON object key:

```json
// key: "state-entries-data"
{
  "2024-03-15": "<encrypted content>",
  "2024-03-16": "<encrypted content>"
}
```

### Target (IndexedDB)

Database: `mini-diary` · Object store: `entries`

| Field | Type | Plaintext? | Purpose |
|---|---|---|---|
| `id` | `number` (autoIncrement) | ✅ yes | Primary key + pagination cursor |
| `encryptedDate` | `string` | ❌ encrypted | The ISO date string |
| `encryptedContent` | `string` | ❌ encrypted | The diary entry text |

```ts
interface EntryRecord {
  id?: number;
  encryptedDate: string;
  encryptedContent: string;
}
```

No indexes. No plaintext date. No sort key.

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
export const STORE_NAME = 'entries';

export interface EntryRecord {
  id?: number;
  encryptedDate: string;
  encryptedContent: string;
}

let _db: Promise<IDBPDatabase> | null = null;

export const getDb = (): Promise<IDBPDatabase> => {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // No indexes — all fields except id are encrypted and opaque
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });
  }
  return _db;
};
```

---

## Step 3 — Rewrite `entriesService.ts`

Replace `src/services/entriesService.ts` entirely.

The service exposes **two separate write operations** — `createEntry` (insert, returns the new `id`) and `updateEntry` (update a known record by `id`). This is necessary because without a plaintext date index there is no way for the service layer to check whether a record for a given day already exists. The hook is responsible for tracking whether today's entry already has an `id`.

```ts
import { DateTime } from 'luxon';
import { getDb, STORE_NAME, type EntryRecord } from './entriesDb';

export interface Entry {
  date: DateTime;
  content: string;
}

export interface EntriesPage {
  entries: (Entry & { id: number })[]; // id is exposed so the hook can track it
  nextCursor: number | null;           // id of the oldest entry in this page, or null if no more
}

const PAGE_SIZE = 10;

/** Fetch one page of entries, newest first (id DESC), starting before `cursor` */
export const fetchEntriesPage = async (
  decryptData: (s: string) => Promise<string>,
  cursor: number | null // null = start from the newest
): Promise<EntriesPage> => {
  const db = await getDb();
  const store = db.transaction(STORE_NAME, 'readonly').store;

  const range = cursor !== null
    ? IDBKeyRange.upperBound(cursor, true) // exclusive: ids older than cursor
    : null;

  const records: EntryRecord[] = [];
  let idbCursor = await store.openCursor(range, 'prev'); // 'prev' = descending id

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
  id: number,
  decryptData: (s: string) => Promise<string>
): Promise<(Entry & { id: number }) | null> => {
  const db = await getDb();
  const record: EntryRecord | undefined = await db.get(STORE_NAME, id);
  if (!record) return null;
  return {
    id: record.id!,
    date: DateTime.fromISO(await decryptData(record.encryptedDate)),
    content: await decryptData(record.encryptedContent),
  };
};

/** Get the min and max id currently stored — needed to initialise a binary search */
export const getIdBounds = async (): Promise<{ min: number; max: number } | null> => {
  const db = await getDb();
  const store = db.transaction(STORE_NAME, 'readonly').store;
  const first = await store.openCursor(null, 'next');
  const last = await store.openCursor(null, 'prev');
  if (!first || !last) return null;
  return { min: first.value.id!, max: last.value.id! };
};

/** Insert a new entry. Returns the assigned id. */
export const createEntry = async (
  entry: Entry,
  encryptData: (s: string) => Promise<string>
): Promise<number> => {
  const db = await getDb();
  const encryptedDate = await encryptData(entry.date.toISODate()!);
  const encryptedContent = await encryptData(entry.content);
  const id = await db.add(STORE_NAME, { encryptedDate, encryptedContent });
  return id as number;
};

/** Update an existing entry in place by its known id. */
export const updateEntry = async (
  id: number,
  entry: Entry,
  encryptData: (s: string) => Promise<string>
): Promise<void> => {
  const db = await getDb();
  const encryptedDate = await encryptData(entry.date.toISODate()!);
  const encryptedContent = await encryptData(entry.content);
  await db.put(STORE_NAME, { id, encryptedDate, encryptedContent });
};

/** Wipe all entries — called on account removal */
export const clearEntries = async (): Promise<void> => {
  const db = await getDb();
  await db.clear(STORE_NAME);
};
```

---

## Step 4 — One-Time Migration from localStorage

Create `src/services/migrateEntries.ts`:

```ts
import { DateTime } from 'luxon';
import { getDb, STORE_NAME } from './entriesDb';

const LS_KEY = 'state-entries-data';
const MIGRATION_FLAG = 'entries-migrated-to-idb-v1';

/**
 * Run once on login. Reads the old localStorage blob, re-encrypts the date
 * (previously stored as a plaintext JSON key), and writes each entry as an
 * individual IndexedDB record.
 *
 * Records are inserted in ascending date order so that id order matches date
 * order — this is important for correct pagination by id DESC.
 *
 * The content was already encrypted with the same key and is reused as-is.
 */
export const migrateLocalStorageEntries = async (
  encryptData: (s: string) => Promise<string>
): Promise<void> => {
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    return;
  }

  const blob: Record<string, string> = JSON.parse(raw);

  // Sort ascending by date string so id order matches date order after insert
  const sorted = Object.entries(blob).sort(([a], [b]) => a.localeCompare(b));

  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');

  // Sequential inserts to guarantee id order = date order
  for (const [dateStr, encryptedContent] of sorted) {
    const encryptedDate = await encryptData(dateStr);
    await tx.store.add({ encryptedDate, encryptedContent });
  }

  await tx.done;
  localStorage.setItem(MIGRATION_FLAG, 'true');
  // Keep the original localStorage blob until confirmed stable.
  // Remove it manually in a future cleanup step.
};
```

Call `migrateLocalStorageEntries(encryptData)` at the end of a successful `tryToLogin`, before the first `useInfiniteQuery` fires.

---

## Step 5 — Replace `useEntriesQuery` with `useInfiniteEntriesQuery`

Delete `src/hooks/useEntriesQuery.ts`. Create `src/hooks/useInfiniteEntriesQuery.ts`:

The hook tracks `todayEntryId` — the IndexedDB `id` of the current day's record if it has already been written this session. This lets save operations call `updateEntry` instead of `createEntry` without any plaintext date lookup.

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
  const { decryptData, encryptData, databaseKeyId } = useContext(AuthContext);
  const queryClient = useQueryClient();

  // Tracks the id of today's entry once it exists in IndexedDB.
  // A ref (not state) because changing it must not trigger a re-render.
  const todayEntryIdRef = useRef<number | null>(null);

  const query = useInfiniteQuery({
    queryKey: queryKeys.entries(databaseKeyId!),
    queryFn: ({ pageParam }) => fetchEntriesPage(decryptData, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(databaseKeyId),
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
        await updateEntry(todayEntryIdRef.current, entry, encryptData);
      } else {
        const newId = await createEntry(entry, encryptData);
        todayEntryIdRef.current = newId;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries(databaseKeyId!) });
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

## Step 6 — Update `useAuth.ts` for `clearEntries`

`clearEntries` is now async. Update `removeAccount`:

```ts
import { clearEntries } from '../services/entriesService';

const removeAccount = async () => {
  await clearEntries();
  setUserAuth(null);
  setDatabaseKey(null);
  queryClient.clear();
};
```

---

## Step 7 — Infinite Scroll in `NotesLayout`

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
| **Create** | `src/services/entriesDb.ts` |
| **Create** | `src/services/migrateEntries.ts` |
| **Create** | `src/hooks/useInfiniteEntriesQuery.ts` |
| **Modify** | `src/services/entriesService.ts` — full rewrite for IndexedDB |
| **Modify** | `src/hooks/useAuth.ts` — `clearEntries` is now async |
| **Modify** | `src/layouts/notesLayout/notesLayout.tsx` — use `useInfiniteEntriesQuery`, add scroll trigger |
| **Delete** | `src/hooks/useEntriesQuery.ts` |

---

## Acceptance Criteria

- [ ] Each diary entry is stored as an individual IndexedDB record
- [ ] Both the date and content are encrypted; only `id` (autoIncrement integer) is plaintext
- [ ] No indexes exist on encrypted fields
- [ ] Entries load newest-first by `id DESC`, 10 at a time
- [ ] Scrolling / clicking "load older" fetches the next page without re-decrypting already-loaded entries
- [ ] Saving today's entry updates the existing record (`updateEntry`) rather than inserting a duplicate
- [ ] A new session correctly detects an existing today-entry from the first page and sets `todayEntryIdRef`
- [ ] Logout and account removal clear the IndexedDB store
- [ ] Existing localStorage entries are migrated on first login, inserted in ascending date order so `id` order matches date order
- [ ] After migration, the original localStorage blob is preserved until a manual cleanup step removes it
- [ ] Binary search over `id` + `fetchEntryById` can locate a specific date without reading all records
