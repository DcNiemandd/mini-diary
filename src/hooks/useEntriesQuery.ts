import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { queryKeys } from '../queryKeys';
import { fetchEntries, saveEntry, type DbEntry } from '../services/entriesStorageService';

export const useEntriesQuery = () => {
    const { decryptData, encryptData, databaseKeyId } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.entries(databaseKeyId!),
        queryFn: () => fetchEntries(decryptData),
        enabled: Boolean(databaseKeyId),
        staleTime: Infinity,
    });

    const mutation = useMutation({
        mutationFn: (entry: DbEntry) => saveEntry(entry, encryptData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.entries(databaseKeyId!) });
        },
    });

    return {
        entries: query.data ?? [],
        isPending: query.isPending,
        isError: query.isError,
        saveEntry: mutation.mutate,
        isSaving: mutation.isPending,
    };
};
