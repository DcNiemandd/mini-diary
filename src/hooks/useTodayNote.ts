import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import type { Entry } from '../services/entriesDbService';
import { useDebounceCall } from './useDebounceCall';
import { useTodayEntryQuery } from './useTodayEntryQuery';

export const useTodayNote = () => {
    const { query: todayEntryQuery, mutation: saveEntryMutation } = useTodayEntryQuery();
    const [todayContent, setTodayContent] = useState('');
    const debouncedMutation = useDebounceCall(saveEntryMutation.mutate, 500);

    // Populate textarea from loaded entry on first load
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTodayContent((prev) => todayEntryQuery?.data?.content || prev || '');
    }, [todayEntryQuery]);

    // Debounced auto-save
    useEffect(() => {
        debouncedMutation(todayContent);
    }, [debouncedMutation, todayContent]);

    const isSaved = todayContent === (todayEntryQuery?.data?.content ?? '') && !saveEntryMutation.isPending;

    // If there's not a today note, we show empty note.
    // Today note is created on the first mutation.
    const todayNote: Entry = {
        content: todayContent,
        date: todayEntryQuery?.data?.date ?? DateTime.now().startOf('day'),
        inRow: todayEntryQuery?.data?.inRow ?? 1,
    };

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

    return { todayNote, setTodayContent, isSaved };
};

