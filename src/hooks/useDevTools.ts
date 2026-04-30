import { DateTime } from 'luxon';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { readRawEntries } from '../services/entriesStorageService';

const STORAGE_KEY = 'state-entries-data';

declare global {
    interface Window {
        devTools?: {
            seedEntries: (count?: number) => Promise<void>;
        };
    }
}

export function useDevTools() {
    const { encryptData } = useContext(AuthContext);

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
            };
            return () => {
                delete window.devTools;
            };
        }
    }, [encryptData]);
}

