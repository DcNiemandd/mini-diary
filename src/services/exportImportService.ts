import { DateTime } from 'luxon';
import { z } from 'zod';
import { ENTRIES_STORE, getDb, USERS_STORE, type EntryRecord } from './db';

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

const IMPORT_JOINER = '\n\u2063\n';

/**
 * Inserts entries under logged user. Same-day entries are merged with IMPORT_JOINER;
 * verbatim re-imports are deduped. Existing inRow chains are extended/bridged forward.
 *
 * Algorithm: snapshot all existing entries in one readonly tx, plan all changes in
 * memory, encrypt off-tx in parallel, then commit in a single short readwrite tx.
 */
const importRawEntries = async (
    importObject: RawExport,
    userId: number,
    decryptData: (s: string) => Promise<string>,
    encryptData: (s: string) => Promise<string>
): Promise<boolean> => {
    const db = await getDb();

    // Snapshot existing entries from the db
    const records: EntryRecord[] = [];
    {
        const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userPk_id');
        const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
        let cur = await idx.openCursor(range, 'next');
        while (cur) {
            records.push(cur.value);
            cur = await cur.continue();
        }
    }
    type Local = {
        id: number;
        date: DateTime;
        content: string;
        inRow: number;
        record: EntryRecord | null; // null for fresh imports (no DB row yet)
    };
    const PLACEHOLDER_ID = -1;

    const locals: Local[] = await Promise.all(
        records.map(
            async (r): Promise<Local> => ({
                id: r.id!,
                date: DateTime.fromISO(await decryptData(r.encryptedDate)),
                content: await decryptData(r.encryptedContent),
                inRow: Number(await decryptData(r.inRow)),
                record: r,
            })
        )
    );
    const byDate = new Map<string, Local>(locals.map((l) => [l.date.toISODate()!, l]));
    const byId = new Map<number, Local>(locals.map((l) => [l.id, l]));

    // Implement imported
    const newLocals: Local[] = [];
    const dirtyIds = new Set<number>();

    const sorted = importObject.entries.toSorted((a, b) => +DateTime.fromISO(a.date) - +DateTime.fromISO(b.date));

    for (const entry of sorted) {
        const existing = byDate.get(entry.date);

        if (existing) {
            // Dedup verbatim re-imports of any joiner-split part
            const existingParts = existing.content.split(IMPORT_JOINER);
            const incomingParts = entry.content.split(IMPORT_JOINER);
            const newParts = incomingParts.filter((p) => !existingParts.includes(p));
            if (newParts.length === 0) continue;
            existing.content = [...existingParts, ...newParts].join(IMPORT_JOINER);
            if (existing.id !== PLACEHOLDER_ID) dirtyIds.add(existing.id);
            continue;
        }

        const date = DateTime.fromISO(entry.date);
        const prev = byDate.get(date.minus({ days: 1 }).toISODate()!);
        let inRow = prev ? prev.inRow + 1 : 1;

        const fresh: Local = {
            id: PLACEHOLDER_ID,
            date,
            content: entry.content,
            inRow,
            record: null,
        };
        byDate.set(entry.date, fresh);
        newLocals.push(fresh);

        // Walk forward shifting inRow. Stop at first gap or first day already correct.
        let nextEntry = byDate.get(date.plus({ days: 1 }).toISODate()!);
        while (nextEntry) {
            inRow += 1;
            if (nextEntry.inRow === inRow) break;
            nextEntry.inRow = inRow;
            if (nextEntry.id !== PLACEHOLDER_ID) dirtyIds.add(nextEntry.id);
            nextEntry = byDate.get(nextEntry.date.plus({ days: 1 }).toISODate()!);
        }
    }

    // Prepare data for the db. Phase 1: new imports stack on top of the existing
    // max order — chronologically wrong, but matches today's id-based behavior
    // until Phase 3 reworks this to renumber by date.
    const maxOrder = records.at(-1)?.order ?? 0;
    const [newEncrypted, dirtyEncrypted] = await Promise.all([
        Promise.all(
            newLocals.map(
                async (l, i): Promise<EntryRecord> => ({
                    userPk: userId,
                    order: maxOrder + i + 1,
                    encryptedDate: await encryptData(l.date.toISODate()!),
                    encryptedContent: await encryptData(l.content),
                    inRow: await encryptData(String(l.inRow)),
                })
            )
        ),
        Promise.all(
            [...dirtyIds].map(async (id): Promise<EntryRecord> => {
                const l = byId.get(id)!;
                return {
                    ...l.record!,
                    encryptedContent: await encryptData(l.content),
                    inRow: await encryptData(String(l.inRow)),
                };
            })
        ),
    ]);

    // Save to the db
    const transaction = db.transaction(ENTRIES_STORE, 'readwrite');
    for (const r of newEncrypted) transaction.store.add(r);
    for (const r of dirtyEncrypted) transaction.store.put(r);
    await transaction.done;

    return true;
};

const importEncryptedEntries = async (importObject: EncryptedExport): Promise<boolean> => {
    const db = await getDb();
    const tx = db.transaction([USERS_STORE, ENTRIES_STORE], 'readwrite');

    const newUserId = (await tx.objectStore(USERS_STORE).add(importObject.user)) as number;

    const entriesStore = tx.objectStore(ENTRIES_STORE);
    const sorted = importObject.entries.toSorted((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i];
        const record: EntryRecord = {
            userPk: newUserId,
            order: i + 1,
            encryptedDate: entry.encryptedDate,
            encryptedContent: entry.encryptedContent,
            inRow: entry.inRow,
        };
        await entriesStore.add(record);
    }

    await tx.done;
    return true;
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

