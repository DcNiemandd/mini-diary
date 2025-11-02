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

    // useEffect(() => {
    //     const populateEntries = async () => {
    //         if (!encryptData) return;



    //         const entriesArr = await Promise.all(
    //             Array.from({ length: 20 }, (_, i) => i).map(async (i) => {
    //                 const date = new Date();
    //                 date.setDate(date.getDate() - (25 - i));
    //                 date.setMonth(date.getMonth() - 1);
    //                 ;
    //                 return ({
    //                     date: date,
    //                     content: await encryptData(await fetch(`https://lorem-api.com/api/lorem?paragraphs=${Math.floor(Math.random() * 4) + 1}&seed=ciririckf`)
    //                         .then(response => response.text())),
    //                 })
    //             })
    //         );
    //         setConvertedEntries(entriesArr.sort((a, b) => a.date.getTime() - b.date.getTime()));
    //         setSavedEntries(prevEntries => ({
    //             ...prevEntries,
    //             ...entriesArr.reduce((acc, entry) => {
    //                 const dateStr = entry.date.toISOString().split('T')[0];
    //                 acc[dateStr] = entry.content;
    //                 return acc;
    //             }, {} as Record<string, string>)
    //         }))

    //     };

    //     populateEntries();
    // }, [encryptData]);


    return {
        entries,
        updateTodaysEntry: setTodaysEntry,
        todaysEntry,
    }
}