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
    inRow: string;
}

const migrateToV1 = (db: IDBPDatabase): void => {
    // users: keyed by encoded databaseKey
    db.createObjectStore(USERS_STORE, { keyPath: 'databaseKey' });

    // entries: autoIncrement id + compound index for per-user cursor pagination
    const entries = db.createObjectStore(ENTRIES_STORE, {
        keyPath: 'id',
        autoIncrement: true,
    });
    entries.createIndex('userId_id', ['userId', 'id']);
};

let _db: Promise<IDBPDatabase> | null = null;

export const getDb = (): Promise<IDBPDatabase> => {
    if (!_db) {
        _db = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                // Run migrations sequentially. Each `if` is a one-way step
                // from oldVersion → next. New versions append a new branch.
                if (oldVersion < 1) migrateToV1(db);
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

