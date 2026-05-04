import { useInfiniteQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { queryKeys } from '../queryKeys';
import { fetchEntriesPage } from '../services/entriesDbService';
import { useAuth } from './useAuth';
import { useToday } from './useToday';

export const useEntriesQuery = () => {
    const { decryptData, userId } = useAuth();
    const today = useToday();

    const query = useInfiniteQuery({
        queryKey: [...queryKeys.entries(userId!), today.toISODate()] as const,
        queryFn: ({ pageParam }) =>
            fetchEntriesPage(userId!, decryptData, pageParam).then((entriesPage) => ({
                ...entriesPage,
                entries: entriesPage.entries.filter(
                    (entry) => entry.date.diff(DateTime.now().startOf('day'), 'days').days !== 0
                ),
            })),
        initialPageParam: null as number | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: Boolean(userId),
        staleTime: Infinity,
    });

    return {
        entries: query.data?.pages.flatMap((page) => page.entries).reverse() ?? [],
        isPending: query.isPending,
        isError: query.isError,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
    };
};
