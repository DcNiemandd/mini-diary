import { DateTime } from 'luxon';
import { ENTRIES_STORE, getDb, type EntryRecord } from './db';

export interface Entry {
    date: DateTime;
    content: string;
    inRow: number;
}

export interface EntriesPage {
    entries: (Entry & { id: number })[];
    nextCursor: number | null;
}

const PAGE_SIZE = 15;

const entryRecordToEntry = async (
    record: EntryRecord,
    decryptData: (s: string) => Promise<string>
): Promise<Entry & { id: number }> => ({
    id: record.id!,
    date: DateTime.fromISO(await decryptData(record.encryptedDate)),
    content: await decryptData(record.encryptedContent),
    inRow: Number(await decryptData(record.inRow)),
});

const entryToEntryRecord = async (
    entry: Entry,
    userId: string,
    encryptData: (s: string) => Promise<string>
): Promise<EntryRecord> => ({
    userId,
    encryptedDate: await encryptData(entry.date.toISODate()!),
    encryptedContent: await encryptData(entry.content),
    inRow: await encryptData(entry.inRow.toString()),
});

export const fetchEntriesPage = async (
    userId: string,
    decryptData: (s: string) => Promise<string>,
    cursor: number | null // null = start from the newest
): Promise<EntriesPage> => {
    const db = await getDb();
    const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userId_id');

    const upperId = cursor !== null ? cursor - 1 : Infinity;
    const range = IDBKeyRange.bound([userId, -Infinity], [userId, upperId]);

    const records: EntryRecord[] = [];
    let idbCursor = await idx.openCursor(range, 'prev');

    while (idbCursor && records.length < PAGE_SIZE) {
        records.push(idbCursor.value);
        idbCursor = await idbCursor.continue();
    }

    const entries = await Promise.all(records.map(async (r) => entryRecordToEntry(r, decryptData)));

    return {
        entries,
        nextCursor: records.length === PAGE_SIZE ? records[records.length - 1].id! : null,
    };
};

export const fetchEntryById = async (
    userId: string,
    id: number,
    decryptData: (s: string) => Promise<string>
): Promise<(Entry & { id: number }) | null> => {
    const db = await getDb();
    const record: EntryRecord | undefined = await db.get(ENTRIES_STORE, id);
    if (!record || record.userId !== userId) return null;
    return {
        id: record.id!,
        date: DateTime.fromISO(await decryptData(record.encryptedDate)),
        content: await decryptData(record.encryptedContent),
        inRow: Number(await decryptData(record.inRow)),
    };
};

/** For searching for a specific date */
export const getIdBounds = async (userId: string): Promise<{ min: number; max: number } | null> => {
    const db = await getDb();
    const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userId_id');
    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    const first = await idx.openCursor(range, 'next');
    const last = await idx.openCursor(range, 'prev');
    if (!first || !last) return null;
    return { min: first.value.id!, max: last.value.id! };
};

export const fetchTodayEntry = async (
    userId: string,
    decryptData: (s: string) => Promise<string>
): Promise<(Entry & { id: number }) | null> => {
    const db = await getDb();
    const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userId_id');

    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    const idbCursor = await idx.openCursor(range, 'prev');

    if (!idbCursor) return null; // No entries at all for this user
    const latestEntry = await entryRecordToEntry(idbCursor.value, decryptData);

    if (!latestEntry.date.startOf('day').equals(DateTime.now().startOf('day'))) {
        // Latest is not today
        return null;
    }

    return latestEntry;
};

/**
 * Create a new entry from a content.
 * Date is current day.
 * inRow is calculated based on the previous entry.
 */
export const createEntry = async (
    userId: string,
    entryText: string,
    encryptData: (s: string) => Promise<string>,
    decryptData: (s: string) => Promise<string>
): Promise<number> => {
    const db = await getDb();
    const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userId_id');

    // Calculate inRow
    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    const lastEntryRecord: EntryRecord | undefined = (await idx.openCursor(range, 'prev'))?.value;
    const lastEntryDate = lastEntryRecord ? DateTime.fromISO(await decryptData(lastEntryRecord.encryptedDate)) : null;
    const today = DateTime.now().startOf('day');
    const inRow =
        lastEntryRecord && lastEntryDate?.diff(today, 'days').days === 1
            ? Number(await decryptData(lastEntryRecord.inRow)) + 1
            : 1;

    const entryWithInRow = { content: entryText, inRow, date: today };

    const record = await entryToEntryRecord(entryWithInRow, userId, encryptData);
    const id = await db.transaction(ENTRIES_STORE, 'readwrite').store.add(record);

    return id as number;
};

/**
 * Update an existing entry. Only the content is editable; the date is fixed at creation.
 */
export const updateEntry = async (
    userId: string,
    id: number,
    entryText: string,
    encryptData: (s: string) => Promise<string>
): Promise<void> => {
    const db = await getDb();
    const record = await db.get(ENTRIES_STORE, id);
    if (!record || record.userId !== userId) throw new Error('Entry not found');

    const encryptedContent = await encryptData(entryText);
    await db.put(ENTRIES_STORE, { ...record, encryptedContent });
};
