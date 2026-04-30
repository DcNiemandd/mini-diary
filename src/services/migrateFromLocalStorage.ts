import { DateTime } from 'luxon';
import { ENTRIES_STORE, getDb, USERS_STORE, type UserRecord } from './db';
import type { Entry } from './entriesDbService';

const LS_AUTH_KEY = 'state-auth-user';
const LS_ENTRIES_KEY = 'state-entries-data';

/**
 * Move state-auth-user from localStorage into the users store.
 * Idempotent. Safe to call on every app start.
 */
export const migrateLocalStorageUser = async (): Promise<UserRecord | null> => {
    const db = await getDb();
    if (db.version < 1) {
        const oldUserAuth = localStorage.getItem(LS_AUTH_KEY);
        if (!oldUserAuth) {
            return null;
        }
        await db.transaction(USERS_STORE, 'readwrite').store.add(JSON.parse(oldUserAuth));
    }
    return null;
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
    const db = await getDb();
    if (db.version < 1) {
        const transaction = db.transaction(ENTRIES_STORE, 'readwrite');

        const oldEntries = localStorage.getItem(LS_ENTRIES_KEY);
        if (oldEntries) {
            const blob: Record<string, string> = JSON.parse(oldEntries);
            const sorted = Object.entries(blob)
                .map(
                    ([dateStr, content]) =>
                        ({ date: DateTime.fromISO(dateStr), content }) satisfies Omit<Entry, 'inRow'>
                )
                .sort(({ date: a }, { date: b }) => a.toMillis() - b.toMillis())
                .reduce(function resolveDaysInRow(acc, entry) {
                    const last = acc[acc.length - 1];
                    acc.push({
                        ...entry,
                        inRow:
                            last && last.date.plus({ days: 1 }).hasSame(entry.date, 'day') ? (last.inRow ?? 1) + 1 : 1,
                    });

                    return acc;
                }, [] as Entry[]);

            await Promise.all(
                sorted.map(async (entry) => {
                    transaction.objectStore(ENTRIES_STORE).add({
                        userId,
                        encryptedDate: await encryptData(entry.date.toISO()!),
                        encryptedContent: entry.content,
                        inRow: await encryptData(String(entry.inRow)),
                    });
                })
            );
        }
        await transaction.done;
    }
};
