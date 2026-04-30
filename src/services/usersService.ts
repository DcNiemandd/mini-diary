import { ENTRIES_STORE, getDb, USERS_STORE, type UserRecord } from './entriesDb';

/** ONLY ONE USER FOR NOW */
export const getCurrentUser = async (): Promise<UserRecord | null> => {
    const db = await getDb();
    const all = await db.getAll(USERS_STORE);
    return all[0] ?? null;
};

export const putUser = async (user: UserRecord): Promise<void> => {
    const db = await getDb();
    await db.put(USERS_STORE, user);
};

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
