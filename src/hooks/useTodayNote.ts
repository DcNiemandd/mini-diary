import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { queryKeys } from '../queryKeys';
import { createEntry, fetchTodayEntry, updateEntry, type Entry } from '../services/entriesDbService';
import { useDebounceCall } from './useDebounceCall';
import { useToday } from './useToday';

export const useTodayNote = () => {
    const { userId, encryptData, decryptData } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const today = useToday((_next, prev) => {
        queryClient.removeQueries({
            queryKey: [...queryKeys.todaysEntry(userId!), prev.toISODate()],
            exact: false,
        });
    });

    const isoDate = today.toISODate()!;
    const savedKey = queryKeys.todaysSavedEntry(userId!, isoDate);
    const draftKey = queryKeys.todaysDraftEntry(userId!, isoDate);

    const savedQuery = useQuery({
        queryKey: savedKey,
        queryFn: () => fetchTodayEntry(userId!, decryptData),
        enabled: Boolean(userId),
        staleTime: Infinity,
    });

    const draftQuery = useQuery<string>({
        queryKey: draftKey,
        queryFn: () => savedQuery.data?.content ?? '',
        enabled: Boolean(userId) && savedQuery.isSuccess,
        staleTime: Infinity,
    });

    const mutation = useMutation({
        mutationKey: savedKey,
        mutationFn: async (content: string): Promise<Entry & { id: number }> => {
            const existing = queryClient.getQueryData<(Entry & { id: number }) | null>(savedKey);
            if (existing?.id) {
                await updateEntry(userId!, existing.id, content, encryptData);
                return { ...existing, content };
            }
            return await createEntry(userId!, content, encryptData, decryptData);
        },
        onSuccess: (saved) => {
            queryClient.setQueryData(savedKey, saved);
        },
        onError: (error) => {
            console.error('Error saving entry:', error);
        },
    });

    const debouncedMutate = useDebounceCall(mutation.mutate, 500);

    const setTodayContent = (content: string) => {
        queryClient.setQueryData(draftKey, content);
        debouncedMutate(content);
    };

    const draftContent = draftQuery.data ?? '';
    const savedContent = savedQuery.data?.content ?? '';
    const isSaved = draftContent === savedContent && !mutation.isPending;

    const todayNote: Entry = {
        content: draftContent,
        date: savedQuery.data?.date ?? today,
        inRow: savedQuery.data?.inRow ?? 1,
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

