import { DateTime } from 'luxon';
import { useEffect } from 'react';
import { ENTRIES_STORE, getDb, type EntryRecord } from '../services/db';
import { readRawEntries } from '../services/entriesStorageService';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'state-entries-data';

declare global {
    interface Window {
        devTools?: {
            seedEntries: (count?: number) => Promise<void>;
            printEntries: () => Promise<void>;
            removeEntries: (fromId?: number, toId?: number) => Promise<void>;
        };
    }
}

export function useDevTools() {
    const { encryptData, decryptData, userId } = useAuth();

    useEffect(() => {
        if (import.meta.env.DEV) {
            window.devTools = {
                seedEntries: async (count = 30) => {
                    const raw = readRawEntries();
                    const today = DateTime.now().startOf('day');

                    for (let i = count; i >= 1; i--) {
                        if (Math.random() < 0.3) continue; // Randomly skip some days to create gaps

                        const date = today.minus({ days: i });
                        const dateStr = date.toISODate()!;
                        if (raw[dateStr]) continue;
                        const content = `Seeded entry for ${date.toLocaleString(DateTime.DATE_FULL)}. This is sample diary content generated for development.`;
                        raw[dateStr] = await encryptData(content);
                    }

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
                    console.log(`Seeded ${count} entries. Reload the page to see them.`);
                },
                printEntries: async () => {
                    const db = await getDb();
                    const idx = db.transaction(ENTRIES_STORE, 'readonly').store.index('userPk_id');
                    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
                    const records: EntryRecord[] = [];
                    let cursor = await idx.openCursor(range, 'next');
                    while (cursor) {
                        records.push(cursor.value);
                        cursor = await cursor.continue();
                    }
                    const entries = await Promise.all(
                        records.map(async (record) => ({
                            id: record.id!,
                            date: DateTime.fromISO(await decryptData(record.encryptedDate)),
                            content: await decryptData(record.encryptedContent),
                            inRow: Number(await decryptData(record.inRow)),
                        }))
                    );

                    const tab = window.open('', '_blank');
                    if (!tab) {
                        console.error('Unable to open new tab for entries output.');
                        return;
                    }

                    tab.document.write(`<pre>${JSON.stringify(entries, null, 2)}</pre>`);
                    tab.document.close();
                },
                removeEntries: async (fromId?: number, toId?: number) => {
                    const db = await getDb();
                    const idx = db.transaction(ENTRIES_STORE, 'readwrite').store.index('userPk_id');
                    const range = IDBKeyRange.bound([userId, fromId ?? -Infinity], [userId, toId ?? Infinity]);
                    let cursor = await idx.openCursor(range, 'next');
                    while (cursor) {
                        await cursor.delete();
                        cursor = await cursor.continue();
                    }
                    console.log(`Removed entries with IDs from ${fromId ?? '-Infinity'} to ${toId ?? 'Infinity'}.`);
                },
            };
            return () => {
                delete window.devTools;
            };
        }
    }, [decryptData, encryptData, userId]);
}

