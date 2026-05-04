import { z } from 'zod';
import { ENTRIES_STORE, getDb, USERS_STORE, type EntryRecord } from './db';

const EXPORT_VERSION = 1;

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const rawEntrySchema = z.object({
    date: isoDateString,
    content: z.string(),
    inRow: z.number().int().nonnegative(),
});

const encryptedEntrySchema = z.object({
    encryptedDate: z.string().min(1),
    encryptedContent: z.string(),
    inRow: z.string().min(1),
});

const encryptedUserSchema = z.object({
    encryptedUserKey: z.string().min(1),
    salt: z.string().min(1),
    hmac: z.string().min(1),
});

const baseExportSchema = z.object({
    version: z.literal(EXPORT_VERSION),
    exportedAt: z.string().datetime(),
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
    const db = await getDb();
    const transaction = db.transaction([ENTRIES_STORE, USERS_STORE], 'readonly');

    const user = await transaction.objectStore(USERS_STORE).get(userId);

    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    let cursor = await transaction.objectStore(ENTRIES_STORE).openCursor(range, 'next');
    const records: EntryRecord[] = [];

    while (cursor) {
        records.push(cursor.value);
        cursor = await cursor.continue();
    }

    return {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        user,
        entries: records,
    };
};

