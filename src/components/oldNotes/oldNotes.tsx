import type { FC } from 'react';
import { useEntriesQuery } from '../../hooks/useEntriesQuery';
import { DailyNote } from '../dailyNote/dailyNote';

export const OldNotes: FC = () => {
    const { isPending, isError, hasNextPage, entries } = useEntriesQuery();

    return (
        <>
            {isPending && <p>Loading entries…</p>}
            {isError && <p>Failed to decrypt entries.</p>}
            {!isPending && !hasNextPage && entries.length > 0 && <p>All entries loaded</p>}
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
