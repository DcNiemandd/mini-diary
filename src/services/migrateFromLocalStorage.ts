import { DateTime } from 'luxon';
import { ENTRIES_STORE, getDb } from './db';
import type { Entry } from './entriesDbService';
import { putUser } from './usersService';

const LS_AUTH_KEY = 'state-auth-user';
const LS_ENTRIES_KEY = 'state-entries-data';
const AUTH_MIGRATED_FLAG = 'migration-auth-done';
const ENTRIES_MIGRATED_FLAG = 'migration-entries-done';

/**
 * Move state-auth-user from localStorage into the users store.
 * Idempotent. Safe to call on every app start.
 */
export const migrateLocalStorageUser = async (): Promise<void> => {
    const db = await getDb();
    if (db.version <= 1) {
        const oldUserAuth = localStorage.getItem(LS_AUTH_KEY);
        const alreadyMigrated = localStorage.getItem(AUTH_MIGRATED_FLAG);
        if (!oldUserAuth || alreadyMigrated) {
            return;
        }
        await putUser(JSON.parse(oldUserAuth));
        localStorage.setItem(AUTH_MIGRATED_FLAG, 'true');
    }
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
    if (db.version <= 1) {
        const oldEntries = localStorage.getItem(LS_ENTRIES_KEY);
        const alreadyMigrated = localStorage.getItem(ENTRIES_MIGRATED_FLAG);
        if (oldEntries && !alreadyMigrated) {
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

            const entriesToAdd = await Promise.all(
                sorted.map(async (entry) => ({
                    userId,
                    encryptedDate: await encryptData(entry.date.toISODate()!),
                    encryptedContent: entry.content,
                    inRow: await encryptData(String(entry.inRow)),
                }))
            );

            const transaction = db.transaction(ENTRIES_STORE, 'readwrite');
            for (const entry of entriesToAdd) {
                transaction.store.add(entry).catch((e) => {
                    console.error('Error migrating entry', entry, e);
                });
            }
            await transaction.done;

            localStorage.setItem(ENTRIES_MIGRATED_FLAG, 'true');
        }
    }
};
