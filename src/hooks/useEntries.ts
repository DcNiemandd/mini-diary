import { useEffect, useState } from "react";
import { useDebounce } from "./useDebounce";
import { useLocalStorage } from "./useStorage";

const EXAMPLE_ENTRIES: Record<string, string> = {
    "2024-06-01": "Today I started using Mini Diary. It's a great app!",
    "2024-06-02": "I wrote my second entry. Loving the simplicity.",
    "2024-06-03": "Third day in a row! Consistency is key.",
    "2024-06-04": "Feeling good about journaling daily.",
    "2024-06-05": "Fifth entry! This app makes it easy.",
    "2024-06-06": "Sixth day, still going strong.",
    "2024-06-07": "A week of entries! Proud of myself.",
};

interface Entry {
    date: Date;
    content: string;
}

export interface EntriesState {
    entries: Entry[] | null;
    updateTodaysEntry: (content: string) => void;
    todaysEntry: string | null;
}

interface UseEntriesProps {
    encryptData: (data: string) => string; decryptData: (data: string) => string
}

const isDateToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

export const useEntries = ({ encryptData, decryptData }: UseEntriesProps): EntriesState => {
    const [savedEntries, setSavedEntries] = useLocalStorage('state-entries-data', EXAMPLE_ENTRIES)
    const [todaysEntry, setTodaysEntry] = useState<string | null>(null);
    const todaysDebounced = useDebounce(todaysEntry, 1000);

    const convertedEntries = Object.entries(savedEntries)
        .map(([dateStr, content]) => ({
            date: new Date(dateStr),
            content: decryptData(content),
        } satisfies Entry))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const entries = convertedEntries.filter(entry => !isDateToday(entry.date));

    // Update today's entry 
    useEffect(() => {
        const todaysEntry = convertedEntries.find(entry => isDateToday(entry.date));
        if (todaysEntry) {
            setTodaysEntry(todaysEntry.content);
        }
    }, [convertedEntries]);

    // Save todays entry
    useEffect(() => {
        if (todaysDebounced === null) return;

        const todayStr = new Date().toISOString().split('T')[0];
        setSavedEntries(prevEntries => ({
            ...prevEntries,
            [todayStr]: encryptData(todaysDebounced),
        }));
    }, [encryptData, setSavedEntries, todaysDebounced]);

    return {
        entries,
        updateTodaysEntry: setTodaysEntry,
        todaysEntry,
    }
}