import { DateTime } from 'luxon';
import { z } from 'zod';
import { ENTRIES_STORE, getDb, USERS_STORE, type EntryRecord } from './db';
import { entryToEntryRecord, fetchEntryByDate, updateEntry, type Entry } from './entriesDbService';

const EXPORT_VERSION = 1;

const isoDateString = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .refine((s) => DateTime.fromISO(s).isValid);

const rawEntrySchema = z.object({
    date: isoDateString,
    content: z.string(),
    inRow: z.number().int().nonnegative(),
});

const encryptedEntrySchema = z.object({
    encryptedDate: z.string().min(1),
    encryptedContent: z.string(),
    inRow: z.string().min(1),
    order: z.number().int().nonnegative(),
});

const encryptedUserSchema = z.object({
    encryptedUserKey: z.string().min(1),
    salt: z.string().min(1),
    hmac: z.string().min(1),
});

const baseExportSchema = z.object({
    version: z.literal(EXPORT_VERSION),
    exportedAt: z.iso.datetime(),
});

export const rawExportSchema = baseExportSchema.extend({
    entries: z.array(rawEntrySchema),
});

export const encryptedExportSchema = baseExportSchema.extend({
    user: encryptedUserSchema,
    entries: z.array(encryptedEntrySchema),
});

export const exportSchema = z.union([encryptedExportSchema, rawExportSchema]);

export type RawExport = z.infer<typeof rawExportSchema>;
export type EncryptedExport = z.infer<typeof encryptedExportSchema>;
export type DiaryExport = z.infer<typeof exportSchema>;

export const isEncryptedExport = (e: DiaryExport): e is EncryptedExport => 'user' in e;

export const exportRawEntries = async (
    userId: number,
    decryptData: (s: string) => Promise<string>
): Promise<RawExport> => {
    const db = await getDb();
    const transaction = db.transaction(ENTRIES_STORE, 'readonly').store.index('userPk_id');

    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    let cursor = await transaction.openCursor(range, 'next');
    const records: EntryRecord[] = [];

    while (cursor) {
        records.push(cursor.value);
        cursor = await cursor.continue();
    }

    const entries = await Promise.all(
        records.map(
            async (r): Promise<RawExport['entries'][number]> => ({
                date: await decryptData(r.encryptedDate),
                content: await decryptData(r.encryptedContent),
                inRow: Number(await decryptData(r.inRow)),
            })
        )
    );

    return {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        entries,
    };
};

export const exportEncryptedEntries = async (userId: number): Promise<EncryptedExport> => {
    console.log(`user ${userId}`);
    const db = await getDb();
    const transaction = db.transaction([ENTRIES_STORE, USERS_STORE], 'readonly');

    const user = await transaction.objectStore(USERS_STORE).get(userId);

    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    let cursor = await transaction.objectStore(ENTRIES_STORE).index('userPk_id').openCursor(range, 'next');
    const records: EntryRecord[] = [];

    while (cursor) {
        records.push(cursor.value);
        cursor = await cursor.continue();
    }

    const entries = records.map((r: EntryRecord, index): EncryptedExport['entries'][number] => ({
        encryptedContent: r.encryptedContent,
        encryptedDate: r.encryptedDate,
        inRow: r.inRow,
        order: index,
    }));

    await transaction.done;

    return {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        user,
        entries,
    };
};

/**
 * Inserts entries under logged user
 * Notes will be merged by the date
 */
const importRawEntries = async (
    importObject: RawExport,
    userId: number,
    decryptData: (s: string) => Promise<string>,
    encryptData: (s: string) => Promise<string>
): Promise<boolean> => {
    const db = await getDb();
    const localByDate = (date: DateTime) => fetchEntryByDate(userId, date, decryptData);

    for (const entry of importObject.entries.toSorted(
        (a, b) => +DateTime.fromISO(a.date) - +DateTime.fromISO(b.date)
    )) {
        const entryDate = DateTime.fromISO(entry.date);
        // Find if there is existing entry for that day
        const existingEntry = await localByDate(entryDate);

        if (existingEntry) {
            // Append existing to the end of that entry
            await updateEntry(
                userId,
                existingEntry.id,
                [existingEntry.content, entry.content].join('\n...\n'),
                encryptData
            );
        } else {
            // Create new entry
            const previousDayEntry = await localByDate(entryDate.minus({ days: 1 }));
            // inRow from previous
            let inRow = previousDayEntry ? previousDayEntry.inRow + 1 : 1;
            const entryWithInRow: Entry = { content: entry.content, inRow, date: entryDate };

            const record = await entryToEntryRecord(entryWithInRow, userId, encryptData);
            const transaction = db.transaction(ENTRIES_STORE, 'readwrite');

            transaction.store.add(record);

            // Update oncoming inRows
            let nextEntry = await localByDate(entryDate.plus({ days: 1 }));
            while (nextEntry) {
                inRow += 1;
                await transaction.store.put({ ...nextEntry, inRow });

                nextEntry = await localByDate(nextEntry.date.plus({ days: 1 }));
            }
            await transaction.done;
        }
    }

    return true;
};

const importEncryptedEntries = async (importObject: EncryptedExport): Promise<boolean> => {
    console.log(importObject.exportedAt);
    return false;
};

/**
 * @throws see {@link z.ZodError}
 */
export const importEntries = async (
    importObject: DiaryExport,
    userId: number,
    decryptData: (s: string) => Promise<string>,
    encryptData: (s: string) => Promise<string>
): Promise<boolean> => {
    if (isEncryptedExport(importObject)) {
        return importEncryptedEntries(encryptedExportSchema.parse(importObject));
    }
    return importRawEntries(rawExportSchema.parse(importObject), userId, decryptData, encryptData);
};

