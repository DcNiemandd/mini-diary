import { DateTime } from 'luxon';

export interface Entry {
    date: DateTime;
    content: string;
    inRow: number;
}

export type DbEntry = Omit<Entry, 'inRow'>;

const STORAGE_KEY = 'state-entries-data';

export const readRawEntries = (): Record<string, string> => {
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : {};
    } catch {
        return {};
    }
};

export const fetchEntries = async (decryptData: (s: string) => Promise<string>): Promise<Entry[]> => {
    const raw = readRawEntries();
    const entries = await Promise.all(
        Object.entries(raw).map(async ([dateStr, encrypted]) => ({
            date: DateTime.fromISO(dateStr),
            content: await decryptData(encrypted),
        }))
    );
    return entries
        .sort((a, b) => a.date.diff(b.date, 'day').days)
        .reduce(function resolveDaysInRow(acc, entry) {
            const last = acc[acc.length - 1];
            acc.push({
                ...entry,
                inRow: last && last.date.plus({ days: 1 }).hasSame(entry.date, 'day') ? (last.inRow ?? 1) + 1 : 1,
            });

            return acc;
        }, [] as Entry[]);
};

export const saveEntry = async (entry: DbEntry, encryptData: (s: string) => Promise<string>): Promise<void> => {
    if (!entry.content) return;
    const raw = readRawEntries();
    const dateStr = entry.date.toISODate()!;
    const encrypted = await encryptData(entry.content);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...raw, [dateStr]: encrypted }));
};

export const clearEntries = (): void => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
        localStorage.setItem(`state-entries-data-deleted-${new Date().toISOString()}`, existing);
    }
    localStorage.removeItem(STORAGE_KEY);
};
