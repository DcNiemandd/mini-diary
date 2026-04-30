import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { queryKeys } from '../queryKeys';
import { createEntry, fetchEntriesPage, updateEntry } from '../services/entriesDbService';

export const useEntriesQuery = () => {
    const { decryptData, encryptData, userId } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const todayEntryIdRef = useRef<number | null>(null);

    const query = useInfiniteQuery({
        queryKey: queryKeys.entries(userId!),
        queryFn: ({ pageParam }) => fetchEntriesPage(userId!, decryptData, pageParam),
        initialPageParam: null as number | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: Boolean(userId),
        staleTime: Infinity,
    });

    useEffect(
        function findTodayEntry() {
            // When the first page loads, check if today's entry is already present
            // and record its id for subsequent saves.
            const firstPage = query.data?.pages[0];
            if (firstPage && todayEntryIdRef.current === null) {
                const todayISO = DateTime.now().toISODate();
                const todayEntry = firstPage.entries.find((e) => e.date.toISODate() === todayISO);
                if (todayEntry) {
                    todayEntryIdRef.current = todayEntry.id;
                }
            }

            console.log('Today entry id ref:', todayEntryIdRef.current);
        },
        [query.data?.pages]
    );

    const mutation = useMutation({
        mutationFn: async (entryContent: string) => {
            if (todayEntryIdRef.current !== null) {
                await updateEntry(userId!, todayEntryIdRef.current, entryContent, encryptData);
            } else {
                const newId = await createEntry(userId!, entryContent, encryptData, decryptData);
                todayEntryIdRef.current = newId;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.entries(userId!) });
        },
        onError: (error) => {
            console.error('Error saving entry:', error);
        },
    });
    return {
        entries:
            query.data?.pages
                ?.slice()
                .reverse()
                .flatMap((page) => page.entries) ?? [],
        isPending: query.isPending,
        isError: query.isError,
        saveEntry: mutation.mutate,
        isSaving: mutation.isPending,
    };
};
