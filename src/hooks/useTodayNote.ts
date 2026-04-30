import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import type { DbEntry, Entry } from '../services/entriesStorageService';
import { useDebounce } from './useDebounce';

export const useTodayNote = (todayEntry: Entry | undefined, saveEntry: (entry: DbEntry) => void, isSaving: boolean) => {
    const [todayContent, setTodayContent] = useState('');
    const debouncedContent = useDebounce(todayContent, 500);

    // Populate textarea from loaded entry on first load
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTodayContent((prev) => prev ?? todayEntry?.content ?? '');
    }, [todayEntry]);

    // Debounced auto-save
    useEffect(() => {
        if (debouncedContent) {
            saveEntry({ date: DateTime.now(), content: debouncedContent });
        }
    }, [debouncedContent, saveEntry]);

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

