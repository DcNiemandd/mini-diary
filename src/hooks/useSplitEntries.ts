import { DateTime } from 'luxon';
import { useEffect, useMemo, useState } from 'react';
import type { Entry } from '../services/entriesDbService';

const startOfToday = () => DateTime.now().startOf('day');

export const useSplitEntries = (entries: Entry[]) => {
    const [today, setToday] = useState(startOfToday);

    // Re-arm a timer at each midnight rollover
    useEffect(() => {
        const ms = DateTime.now().plus({ days: 1 }).startOf('day').diff(DateTime.now()).milliseconds;
        const timeout = setTimeout(() => setToday(startOfToday()), ms);
        return () => clearTimeout(timeout);
    }, [today]);

    const todayEntry = useMemo(() => entries.find((e) => e.date.hasSame(today, 'day')), [entries, today]);

    const pastEntries = useMemo(() => entries.filter((e) => !e.date.hasSame(today, 'day')), [entries, today]);

    return { todayEntry, pastEntries, today } as const;
};

