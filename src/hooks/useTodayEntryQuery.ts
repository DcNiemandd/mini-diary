import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { queryKeys } from '../queryKeys';
import { createEntry, fetchTodayEntry, updateEntry, type Entry } from '../services/entriesDbService';
import { useToday } from './useToday';

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
            const existingEntry = queryClient.getQueryData<(Entry & { id: number }) | null>(queryKey);
            if (existingEntry?.id) {
                await updateEntry(userId!, existingEntry.id, entryContent, encryptData);
            } else {
                await createEntry(userId!, entryContent, encryptData, decryptData);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (error) => {
            console.error('Error saving entry:', error);
        },
    });

    return { query, mutation, queryKey };
};
