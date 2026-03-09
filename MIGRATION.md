# Migration Plan: Temporal → Sustainable Architecture

> **Goal:** Replace the monolithic `AppContext` state-management pattern with TanStack Query v5 for all async/server-like state, while keeping only truly synchronous UI state in React context.

---

## Current Architecture Analysis

### Problems

| Issue | Location | Impact |
|-------|----------|--------|
| Single `AppContext` holds `auth`, `entries`, and `settings` | `appContext.ts` | Every update to any slice re-renders all consumers |
| Complex `useEffect` chains for async decryption | `useEntries.ts:36-49` | No loading state, no error state, silent failures |
| `encryptData`/`decryptData` passed as props to `useEntries` | `appContextProvider.tsx:10-13` | Tight coupling, hard to test |
| `removeAccount` has a `// TODO: clear entries data` comment | `useAuth.ts:68` | Cross-cutting concern violation, stale data risk |
| `useStorage` has `initialValue` as a `useEffect` dep | `useStorage.ts:31` | Potential infinite re-render loops with unstable refs |
| No error handling for failed decryption | `useEntries.ts:40-46` | Corrupted entries silently produce bad state |
| `isSaved` logic spread across `useEntries` and component | `useEntries.ts:54-69` | Unclear ownership of UI feedback state |

---

## Target Architecture

```
main.tsx
└── QueryClientProvider          ← TanStack Query root
    └── App.tsx
        └── AuthProvider         ← Lean context: just isLoggedIn + crypto fns
            └── SettingsProvider ← Lean context: theme/color prefs (sync only)
                └── Router.tsx
                    ├── LoginLayout   ← useMutation(login)
                    └── NotesLayout
                        ├── useQuery(entries)          ← reads & decrypts
                        └── useMutation(saveEntry)     ← encrypts & writes
```

---

## Step-by-Step Migration

---

### Step 1 — Install TanStack Query

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

TanStack Query v5 requires React 18+. This project is on React 19, so no issues.

---

### Step 2 — Create Query Keys

Create `src/queryKeys.ts` to centralise all query key definitions:

```ts
// src/queryKeys.ts
export const queryKeys = {
  entries: (userId: string) => ['entries', userId] as const,
  todaysEntry: (userId: string) => ['entries', userId, 'today'] as const,
} as const;
```

Using a function ensures cache is automatically scoped per user — when the user logs out and a new one logs in, keys differ and stale data is never shown.

---

### Step 3 — Wrap the App in QueryClientProvider

Update `src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Entries live in localStorage — no network, so stale time can be high
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60 * 24, // 24h — v5 renamed cacheTime → gcTime
      retry: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
```

---

### Step 4 — Slim Down AuthContext

The auth context no longer needs to manage entries. It only needs to expose the crypto functions and login state.

**Update `src/contexts/authContext/authContext.ts`** (rename from `appContext`):

```ts
export interface AuthContextValue {
  isUser: boolean;
  isLoggedIn: boolean;
  databaseKeyId: string | null;   // opaque ID used as query key scope
  encryptData: (data: string) => Promise<string>;
  decryptData: (data: string) => Promise<string>;
  logout: () => void;
  removeAccount: () => void;
}
```

Remove `entries` and `settings` from the context entirely.

---

### Step 5 — Create an Entries Service Layer

Extract pure async functions from `useEntries` into a service file. This makes them independently testable and usable as TanStack Query `queryFn`/`mutationFn`.

Create `src/services/entriesService.ts`:

```ts
import { DateTime } from 'luxon';

export interface Entry {
  date: DateTime;
  content: string;
}

const STORAGE_KEY = 'state-entries-data';

/** Read raw encrypted entries from localStorage */
export const readRawEntries = (): Record<string, string> => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : {};
  } catch {
    return {};
  }
};

/** Decrypt all entries — used as a queryFn */
export const fetchEntries = async (
  decryptData: (s: string) => Promise<string>
): Promise<Entry[]> => {
  const raw = readRawEntries();
  const entries = await Promise.all(
    Object.entries(raw).map(async ([dateStr, encrypted]) => ({
      date: DateTime.fromISO(dateStr),
      content: await decryptData(encrypted),
    }))
  );
  return entries.sort((a, b) => a.date.diff(b.date, 'day').days);
};

/** Encrypt and persist a single entry — used as a mutationFn */
export const saveEntry = async (
  entry: Entry,
  encryptData: (s: string) => Promise<string>
): Promise<void> => {
  if (!entry.content) return;
  const raw = readRawEntries();
  const dateStr = entry.date.toISODate()!;
  const encrypted = await encryptData(entry.content);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...raw, [dateStr]: encrypted }));
};

/** Clear all entries — called on account removal */
export const clearEntries = (): void => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    localStorage.setItem(`state-entries-data-deleted-${new Date().toISOString()}`, existing);
  }
  localStorage.removeItem(STORAGE_KEY);
};
```

---

### Step 6 — Replace useEntries with useQuery + useMutation

Delete `src/hooks/useEntries.ts`. Create `src/hooks/useEntriesQuery.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { fetchEntries, saveEntry } from '../services/entriesService';
import { queryKeys } from '../queryKeys';

export const useEntriesQuery = () => {
  const { decryptData, databaseKeyId } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entries(databaseKeyId!),
    queryFn: () => fetchEntries(decryptData),
    enabled: Boolean(databaseKeyId),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (entry: { date: DateTime; content: string }) =>
      saveEntry(entry, encryptData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries(databaseKeyId!) });
    },
  });

  return {
    entries: query.data ?? [],
    isPending: query.isPending,  // v5: use isPending, not isLoading
    isError: query.isError,
    saveEntry: mutation.mutate,
    isSaving: mutation.isPending,
  };
};
```

**Key benefits over `useEntries`:**
- `isLoading` / `isError` come for free — no manual state
- Decryption only runs when `databaseKeyId` is set (`enabled` flag)
- `invalidateQueries` on save replaces the brittle `useEffect` save chain
- No dependency on externally passed `encryptData`/`decryptData` props

---

### Step 7 — Handle Today's Entry with useMutation + useDebounce

Today's entry still needs local optimistic state (user is typing). Keep the local `useState` for the textarea value, but replace the save `useEffect` with a debounced mutation call.

In `NotesLayout` (or a dedicated `useTodayEntry` hook):

```ts
const [todayContent, setTodayContent] = useState('');
const debouncedContent = useDebounce(todayContent, 500);
const { saveEntry, isSaving } = useEntriesQuery();

useEffect(() => {
  if (debouncedContent) {
    saveEntry({ date: DateTime.now(), content: debouncedContent });
  }
}, [debouncedContent]);

// isSaved = todayContent === debouncedContent && !isSaving
```

The `isSaved` computation becomes a simple derived value — no separate state needed.

---

### Step 8 — Migrate Login to useMutation

Replace the `tryToLogin` function called directly in `LoginForm` with a TanStack mutation for proper loading/error states:

```ts
// In LoginForm.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/authContext/authContext';

const queryClient = useQueryClient();
const { tryToLogin } = useContext(AuthContext);

const loginMutation = useMutation({
  mutationFn: (password: string) => tryToLogin(password),
  onError: () => {
    passwordInput.setCustomValidity('Incorrect password');
  },
});
```

---

### Step 9 — Invalidate Queries on Logout / Account Removal

When the user logs out or removes their account, all cached entry data must be cleared so it cannot leak to the next session.

In `useAuth.ts`:

```ts
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const logout = () => {
  setDatabaseKey(null);
  queryClient.clear(); // removes all cached query data
};

const removeAccount = () => {
  clearEntries(); // from entriesService — handles backup + clear
  setUserAuth(null);
  setDatabaseKey(null);
  queryClient.clear();
};
```

This resolves the `// TODO: clear entries data from useEntries` comment permanently.

---

### Step 10 — Split and Simplify AppContext

After the above steps, `AppContext` can be split into two lean contexts:

**`AuthContext`** — only auth state and crypto functions (changes rarely):
```ts
// src/contexts/authContext/authContext.ts
export interface AuthContextValue {
  isUser: boolean;
  isLoggedIn: boolean;
  databaseKeyId: string | null;
  tryToLogin: (password: string) => Promise<boolean>;
  logout: () => void;
  removeAccount: () => void;
  encryptData: (data: string) => Promise<string>;
  decryptData: (data: string) => Promise<string>;
}
```

**`SettingsContext`** — only theme preferences (no re-render cost for entries updates):
```ts
// src/contexts/settingsContext/settingsContext.ts
export interface SettingsContextValue {
  colorScheme: Theme;
  setColorScheme: Dispatch<Theme>;
  customColor: Color;
  setCustomColor: Dispatch<Color>;
  useCustomColor: boolean;
  setUseCustomColor: Dispatch<boolean>;
}
```

Entries are no longer in context — components call `useEntriesQuery()` directly.

---

### Step 11 — Fix useStorage initialValue Dependency

The current `useStorage` has `initialValue` as a `useEffect` dependency, which can cause re-runs when `initialValue` is an object literal (new reference each render):

```ts
// CURRENT — problematic
useEffect(() => {
  setStoredValue(getValue(key, initialValue)); // initialValue dep unstable
}, [getValue, initialValue, key]);
```

#### Preferred: `useEffectEvent` (React 19 experimental)

`useEffectEvent` is the semantically correct fix. It wraps the body of the effect into a non-reactive "event" — the function always reads the latest values of `getValue` and `initialValue` at call time, but changes to them do not make the effect re-fire. Only truly reactive deps (`key`) remain in the array.

```ts
import { useEffect, experimental_useEffectEvent } from 'react';

// FIXED — preferred
const onLoadFromStorage = useEffectEvent(() => {
  setStoredValue(getValue(key, initialValue));
});

useEffect(() => {
  onLoadFromStorage();
}, [key]); // ✅ key is the only reactive dep; getValue and initialValue are non-reactive
```

> **Note:** `useEffectEvent` is still experimental in React 19. Import it as `experimental_useEffectEvent` from `'react'`. It is not yet part of the stable API surface, but it is available in the React 19 package without any extra canary build. The React team considers it ready for production use inside apps (not libraries).
>
> **Do not** put `onLoadFromStorage` in the dependency array — Effect Events are stable by design and are explicitly excluded from deps.

#### Fallback: `useRef` (stable, no experimental API)

If you prefer to avoid experimental APIs, stabilise the initial value with `useRef` instead:

```ts
import { useEffect, useRef } from 'react';

// FIXED — fallback
const initialValueRef = useRef(initialValue);

useEffect(() => {
  setStoredValue(getValue(key, initialValueRef.current));
}, [getValue, key]); // initialValue no longer a dep
```

The `useRef` approach freezes `initialValue` at mount time and never updates it — acceptable here because `initialValue` is a fallback for missing storage data, not a meaningful reactive input. The `useEffectEvent` approach is preferred because it reads the *current* `initialValue` on each `key` change, which is more correct if callers ever change the fallback.

---

## Files to Create / Modify / Delete

| Action | File |
|--------|------|
| **Create** | `src/queryKeys.ts` |
| **Create** | `src/services/entriesService.ts` |
| **Create** | `src/hooks/useEntriesQuery.ts` |
| **Create** | `src/contexts/authContext/authContext.ts` |
| **Create** | `src/contexts/authContext/authContextProvider.tsx` |
| **Create** | `src/contexts/settingsContext/settingsContext.ts` |
| **Create** | `src/contexts/settingsContext/settingsContextProvider.tsx` |
| **Modify** | `src/main.tsx` — add `QueryClientProvider` |
| **Modify** | `src/App.tsx` — swap `AppContextProvider` for split providers |
| **Modify** | `src/hooks/useAuth.ts` — add `queryClient.clear()` on logout/remove |
| **Modify** | `src/hooks/useStorage.ts` — fix `initialValue` dep with `useRef` |
| **Modify** | `src/layouts/notesLayout/notesLayout.tsx` — use `useEntriesQuery()` |
| **Modify** | `src/components/loginForm/loginForm.tsx` — use `useMutation` |
| **Delete** | `src/contexts/appContext/appContext.ts` |
| **Delete** | `src/contexts/appContext/appContextProvider.tsx` |
| **Delete** | `src/hooks/useEntries.ts` |

---

## Migration Order

Complete the steps in this order to keep the app working at each stage:

1. `Step 1` — Install dependencies
2. `Step 3` — Add `QueryClientProvider` (non-breaking wrapper)
3. `Step 2` + `Step 5` — Create `queryKeys.ts` and `entriesService.ts` (new files, no side effects)
4. `Step 6` — Create `useEntriesQuery.ts` (new file)
5. `Step 10` — Split `AppContext` into `AuthContext` + `SettingsContext`
6. `Step 4` — Update `AuthContext` interface, update `useAuth.ts`
7. `Step 9` — Add `queryClient.clear()` to `useAuth.ts`
8. `Step 7` — Update `NotesLayout` to use `useEntriesQuery`
9. `Step 8` — Update `LoginForm` to use `useMutation`
10. `Step 11` — Fix `useStorage` dep bug
11. Delete old files

---

## Acceptance Criteria

- [ ] Login, logout, and account removal work correctly
- [ ] Entries decrypt and display on login
- [ ] Today's entry saves (with debounce) and re-appears after page reload
- [ ] Logout clears all cached entry data from memory
- [ ] `isPending` state is shown while entries are decrypting (v5 API)
- [ ] `isError` state is shown if decryption fails
- [ ] No `useEffect` chains for async data — replaced by `useQuery`/`useMutation`
- [ ] `AppContext` is deleted
- [ ] React DevTools shows no unnecessary re-renders when typing in the textarea
