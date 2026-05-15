import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FC, type PropsWithChildren } from 'react';
import { useDebounceCall } from '../../hooks/useDebounceCall';
import { useSession } from '../../hooks/useSession';
import { useToday } from '../../hooks/useToday';
import type { TodayNoteState } from '../../hooks/useTodayNote';
import { queryKeys } from '../../queryKeys';
import { createEntry, fetchTodayEntry, updateEntry, type Entry } from '../../services/entriesDbService';
import { TodayNoteContext } from './todayNoteContext';

export const TodayNoteContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const { userId, encryptData, decryptData } = useSession();
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState<string | null>(null);
    const today = useToday((_next, prev) => {
        queryClient.removeQueries({
            queryKey: [...queryKeys.todaysEntry(userId), prev.toISODate()],
            exact: false,
        });
        setDraft(null);
    });

    const isoDate = today.toISODate()!;
    const savedKey = queryKeys.todaysSavedEntry(userId, isoDate);

    const savedQuery = useQuery({
        queryKey: savedKey,
        queryFn: () => fetchTodayEntry(userId, decryptData),
        staleTime: Infinity,
    });

    const savedContent = savedQuery.data?.content ?? '';

    const mutation = useMutation({
        mutationKey: savedKey,
        mutationFn: async (content: string): Promise<Entry & { id: number }> => {
            const existing = queryClient.getQueryData<(Entry & { id: number }) | null>(savedKey);
            if (existing?.id) {
                await updateEntry(userId, existing.id, content, encryptData);
                return { ...existing, content };
            }
            return await createEntry(userId, content, encryptData, decryptData);
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
        setDraft(content);
        debouncedMutate(content);
    };

    const draftContent = draft ?? savedContent;
    const isSaved = draftContent === savedContent && !mutation.isPending;

    const todayNote: Entry = {
        content: draftContent,
        date: savedQuery.data?.date ?? today,
        inRow: savedQuery.data?.inRow ?? 1,
    };

    useEffect(
        function resetDraftOnInvalidation() {
            const unsub = queryClient.getQueryCache().subscribe((event) => {
                if (
                    event.type === 'updated' &&
                    event.action.type === 'invalidate' &&
                    JSON.stringify(event.query.queryKey) === JSON.stringify(savedKey)
                ) {
                    setDraft(null);
                }
            });
            return unsub;
        },
        [queryClient, savedKey]
    );

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

    const value: TodayNoteState = { todayNote, setTodayContent, isSaved };
    return <TodayNoteContext.Provider value={value}>{children}</TodayNoteContext.Provider>;
};

