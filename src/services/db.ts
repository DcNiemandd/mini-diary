import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type { CSSProperties } from 'react';

const DB_NAME = 'mini-diary';
const DB_VERSION = 3;
export const ENTRIES_STORE = 'entries';
export const USERS_STORE = 'users';

export type ColorScheme = 'light' | 'dark' | 'system';
export type IdleTimeoutMinutes = 1 | 3 | 5 | 15 | 30;

export interface UserSettings {
    colorScheme: ColorScheme;
    customColor: CSSProperties['color'] | undefined;
    isUseCustomColor: boolean;
    idleTimeout: IdleTimeoutMinutes;
}

export const defaultUserSettings = (): UserSettings => ({
    colorScheme: 'system',
    customColor: 'oklch(0.76 0.2 20)',
    isUseCustomColor: false,
    idleTimeout: 5,
});

export interface UserRecord {
    id?: number;
    username: string;
    encryptedUserKey: string;
    salt: string;
    hmac: string;
    settings: UserSettings;
}

export interface EntryRecord {
    id?: number;
    userPk: number; // FK → users.id
    order: number;
    encryptedDate: string;
    encryptedContent: string;
    inRow: string;
}

const migrateToV1 = (db: IDBPDatabase): void => {
    // users: keyed by encoded databaseKey
    db.createObjectStore(USERS_STORE, { keyPath: 'id' satisfies keyof UserRecord, autoIncrement: true });

    // entries: autoIncrement id + compound index for per-user cursor pagination
    const entries = db.createObjectStore(ENTRIES_STORE, {
        keyPath: 'id' satisfies keyof EntryRecord,
        autoIncrement: true,
    });
    entries.createIndex('userPk_id', ['userPk', 'id']);
};

const migrateToV2 = async (
    transaction: IDBPTransaction<unknown, ArrayLike<string>, 'versionchange'>
): Promise<void> => {
    // Backfill `order = id` on every existing entry so the new index is fully
    // populated, then create the compound index used for date-aware ordering.
    const entries = transaction.objectStore(ENTRIES_STORE);
    let cursor = await entries.openCursor();
    while (cursor) {
        const record = cursor.value as EntryRecord;
        await cursor.update({ ...record, order: record.id! });
        cursor = await cursor.continue();
    }
    entries.createIndex('userPk_order', ['userPk', 'order']);
};

const LEGACY_THEME_KEY = 'state-theme-theme';
const LEGACY_CUSTOM_COLOR_KEY = 'state-theme-custom-color';
const LEGACY_USE_CUSTOM_COLOR_KEY = 'state-theme-use-custom-color';
const LEGACY_IDLE_TIMEOUT_KEY = 'state-idle-timeout';

const readLegacySettings = (): UserSettings => {
    const fallback = defaultUserSettings();
    const parse = <T>(key: string, validate: (raw: unknown) => raw is T, def: T): T => {
        const raw = localStorage.getItem(key);
        if (raw === null) return def;
        try {
            const parsed: unknown = JSON.parse(raw);
            return validate(parsed) ? parsed : def;
        } catch {
            return def;
        }
    };
    return {
        colorScheme: parse(
            LEGACY_THEME_KEY,
            (v): v is ColorScheme => v === 'light' || v === 'dark' || v === 'system',
            fallback.colorScheme
        ),
        customColor: parse(LEGACY_CUSTOM_COLOR_KEY, (v): v is string => typeof v === 'string', fallback.customColor),
        isUseCustomColor: parse(
            LEGACY_USE_CUSTOM_COLOR_KEY,
            (v): v is boolean => typeof v === 'boolean',
            fallback.isUseCustomColor
        ),
        idleTimeout: parse(
            LEGACY_IDLE_TIMEOUT_KEY,
            (v): v is IdleTimeoutMinutes => v === 1 || v === 3 || v === 5 || v === 15 || v === 30,
            fallback.idleTimeout
        ),
    };
};

const clearLegacySettings = (): void => {
    localStorage.removeItem(LEGACY_THEME_KEY);
    localStorage.removeItem(LEGACY_CUSTOM_COLOR_KEY);
    localStorage.removeItem(LEGACY_USE_CUSTOM_COLOR_KEY);
    localStorage.removeItem(LEGACY_IDLE_TIMEOUT_KEY);
};

const migrateToV3 = async (
    transaction: IDBPTransaction<unknown, ArrayLike<string>, 'versionchange'>
): Promise<void> => {
    // Profile-import has historically left several pre-v3 rows in USERS_STORE,
    // even though only the latest was reachable. v3 keeps all of them and
    // names each row with its own id (as a string) so the unique `username`
    // index has a stable, collision-free initial value. The most recent user
    // (highest id) also inherits the global legacy theme settings; older
    // imports get defaults since pre-v3 theme wasn't tracked per-user.
    const legacySettings = readLegacySettings();
    const users = transaction.objectStore(USERS_STORE);

    const all = (await users.getAll()) as UserRecord[];
    if (all.length > 0) {
        const mostRecentId = all.reduce<number>((max, u) => ((u.id ?? 0) > max ? u.id! : max), 0);

        for (const u of all) {
            const id = u.id!;
            await users.put({
                ...u,
                username: id === mostRecentId ? '' : String(id),
                settings: id === mostRecentId ? legacySettings : defaultUserSettings(),
            });
        }
    }

    users.createIndex('username', 'username', { unique: true });

    clearLegacySettings();
};

let _db: Promise<IDBPDatabase> | null = null;

export const getDb = (): Promise<IDBPDatabase> => {
    if (!_db) {
        _db = openDB(DB_NAME, DB_VERSION, {
            async upgrade(db, oldVersion, _newVersion, transaction) {
                // Run migrations sequentially. Each `if` is a one-way step
                // from oldVersion → next. New versions append a new branch.
                if (oldVersion < 1) migrateToV1(db);
                if (oldVersion < 2) await migrateToV2(transaction);
                if (oldVersion < 3) await migrateToV3(transaction);
            },
            blocked(currentVersion, blockedVersion) {
                // Older tab still holds the previous version open and ignored
                // our `versionchange` ping. Surface it so the user can close it.
                console.warn(
                    `[entriesDb] open blocked: existing connection at v${currentVersion} is preventing upgrade to v${blockedVersion}. Close other tabs of this app.`
                );
            },
            blocking(currentVersion, blockedVersion) {
                // Another tab is trying to upgrade. Drop our connection so it
                // can proceed; the next getDb() call will reopen at the new version.
                console.warn(
                    `[entriesDb] blocking newer version: closing v${currentVersion} connection to allow upgrade to v${blockedVersion}.`
                );
                closeDb();
            },
            terminated() {
                // Browser killed the connection (storage eviction, hardware
                // event, etc.). Reset the cached promise so future calls reopen.
                console.warn('[entriesDb] connection terminated unexpectedly.');
                _db = null;
            },
        });
    }
    return _db;
};

export const closeDb = (): void => {
    if (!_db) return;
    const pending = _db;
    _db = null;
    pending.then((db) => db.close()).catch(() => {});
};
