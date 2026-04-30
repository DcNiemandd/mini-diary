import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';

const DB_NAME = 'mini-diary';
const DB_VERSION = 1;
export const STORE_NAME = 'entries';

export interface EntryRecord {
    id?: number;
    encryptedDate: string;
    encryptedContent: string;
}

type UpgradeTx = IDBPTransaction<unknown, string[], 'versionchange'>;

const migrateToV1 = (db: IDBPDatabase, _tx: UpgradeTx): void => {
    // No indexes — every field except `id` is encrypted and opaque.
    db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
    });
};

let _db: Promise<IDBPDatabase> | null = null;

export const getDb = (): Promise<IDBPDatabase> => {
    if (!_db) {
        _db = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, _newVersion, tx) {
                // Run migrations sequentially. Each `if` is a one-way step
                // from oldVersion → next. New versions append a new branch.
                if (oldVersion < 1) migrateToV1(db, tx);
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
