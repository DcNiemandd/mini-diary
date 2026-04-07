import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import type { DbEntry, Entry } from '../services/entriesService';
import { useDebounce } from './useDebounce';

export const useTodayNote = (
    todayEntry: Entry | undefined,
    saveEntry: (entry: DbEntry) => void,
    isSaving: boolean,
) => {
    const [todayContent, setTodayContent] = useState('');
    const debouncedContent = useDebounce(todayContent, 500);

    // Populate textarea from loaded entry on first load
    useEffect(() => {
        if (todayEntry && !todayContent) {
            setTodayContent(todayEntry.content);
        }
    }, [todayEntry]);

    // Debounced auto-save
    useEffect(() => {
        if (debouncedContent) {
            saveEntry({ date: DateTime.now(), content: debouncedContent });
        }
    }, [debouncedContent]);

    const isSaved = todayContent === debouncedContent && !isSaving;

    // Block browser nav before save is done
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        if (!isSaved) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSaved]);

    return { todayContent, setTodayContent, isSaved };
};
