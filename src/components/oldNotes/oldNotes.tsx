import type { FC } from 'react';
import { useEntriesQuery } from '../../hooks/useEntriesQuery';
import { DailyNote } from '../dailyNote/dailyNote';

export const OldNotes: FC = () => {
    const { isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage, entries } = useEntriesQuery();

    return (
        <>
            {isPending && <p>Loading entries…</p>}
            {isError && <p>Failed to decrypt entries.</p>}
            <button
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage || isFetchingNextPage}
            >
                {isFetchingNextPage ? 'Loading…' : hasNextPage ? 'Load older entries' : 'All entries loaded'}
            </button>
            {entries.map((entry) => (
                <DailyNote
                    key={entry.date.toISODate()}
                    note={entry.content}
                    date={entry.date}
                    daysInRow={entry.inRow}
                />
            ))}
        </>
    );
};
