import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { queryKeys } from '../queryKeys';
import { createEntry, fetchTodayEntry, updateEntry, type Entry } from '../services/entriesDbService';
import { useToday } from './useToday';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const useTodayEntryQuery = () => {
    const { userId, decryptData, encryptData } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const today = useToday();
    const queryKey = [...queryKeys.todaysEntry(userId!), today.toISODate()] as const;

    const query = useQuery({
        queryKey,
        queryFn: () => fetchTodayEntry(userId!, decryptData),
        enabled: Boolean(userId),
        staleTime: Infinity,
    });

    const mutation = useMutation({
        mutationKey: queryKey,
        mutationFn: async (entryContent: string) => {
            await delay(5000);
            const existingEntry = queryClient.getQueryData<(Entry & { id: number }) | null>(queryKey);
            if (existingEntry?.id) {
                await updateEntry(userId!, existingEntry.id, entryContent, encryptData);
            } else {
                const id = await createEntry(userId!, entryContent, encryptData, decryptData);
                queryClient.setQueryData(queryKey, { ...existingEntry, id });
            }
        },
        onError: (error) => {
            console.error('Error saving entry:', error);
        },
    });

    return { query, mutation, queryKey };
};
