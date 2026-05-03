import { useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useEffect } from 'react';
import type { Entry } from '../services/entriesDbService';
import { useDebounceCall } from './useDebounceCall';
import { useTodayEntryQuery } from './useTodayEntryQuery';

export const useTodayNote = () => {
    const queryClient = useQueryClient();
    const { query: todayEntryQuery, mutation: saveEntryMutation, queryKey } = useTodayEntryQuery();
    const debouncedMutation = useDebounceCall(saveEntryMutation.mutate, 500);

    const setTodayContent = (content: string) => {
        queryClient.setQueryData(queryKey, (oldData: Entry | null) => ({
            ...oldData,
            content,
        }));
        debouncedMutation(content);
    };

    const todayContent = todayEntryQuery?.data?.content ?? '';
    const isSaved = !saveEntryMutation.isPending;

    // If there's not a today note, we show empty note.
    // Today note is created on the first mutation.
    const todayNote: Entry = {
        content: todayContent,
        date: todayEntryQuery?.data?.date ?? DateTime.now().startOf('day'),
        inRow: todayEntryQuery?.data?.inRow ?? 1,
    };

    useEffect(
        function blockNavigationBeforeSave() {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            if (!isSaved) {
                window.addEventListener('beforeunload', handleBeforeUnload);
            }
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        },
        [isSaved]
    );

    return { todayNote, setTodayContent, isSaved };
};

