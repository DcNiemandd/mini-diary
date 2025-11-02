import { useEffect, useState } from "react";
import { useDebounce } from "./useDebounce";
import { useLocalStorage } from "./useStorage";


interface Entry {
    date: Date;
    content: string;
}

export interface EntriesState {
    entries: Entry[] | null;
    updateTodaysEntry: (content: Entry) => void;
    todaysEntry: Entry | null;
}

interface UseEntriesProps {
    encryptData?: (data: string) => Promise<string>;
    decryptData?: (data: string) => Promise<string>;
}

const isDateToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

export const useEntries = ({ encryptData, decryptData }: UseEntriesProps): EntriesState => {
    const [savedEntries, setSavedEntries] = useLocalStorage<Record<string, string>>('state-entries-data', {});
    const [todaysEntry, setTodaysEntry] = useState<Entry | null>(null);
    const todaysDebounced = useDebounce(todaysEntry, 1000);

    // Convert only on mount
    const [convertedEntries, setConvertedEntries] = useState<Entry[]>([]);
    useEffect(() => {
        const convertEntries = async () => {
            if (!decryptData) return;

            const entriesArr = await Promise.all(
                Object.entries(savedEntries).map(async ([dateStr, content]) => ({
                    date: new Date(dateStr),
                    content: await decryptData(content),
                }))
            );
            setConvertedEntries(entriesArr.sort((a, b) => a.date.getTime() - b.date.getTime()));
        };
        convertEntries();
    }, [decryptData]);

    const entries = convertedEntries.filter(entry => !isDateToday(entry.date));

    // Update today's entry 
    useEffect(() => {
        setTodaysEntry(convertedEntries.find(entry => isDateToday(entry.date)) ?? null);
    }, [convertedEntries]);

    // Save todays entry
    useEffect(() => {
        const saveTodaysEntry = async () => {
            if (todaysDebounced === null || !todaysDebounced.content || !encryptData) return;

            const todayStr = todaysDebounced.date.toISOString().split('T')[0];
            const encryptedEntry = await encryptData(todaysDebounced.content);

            setSavedEntries(prevEntries => ({
                ...prevEntries,
                [todayStr]: encryptedEntry,
            }));
        }
        saveTodaysEntry();
    }, [decryptData, encryptData, todaysDebounced]);

    return {
        entries,
        updateTodaysEntry: setTodaysEntry,
        todaysEntry,
    }
}