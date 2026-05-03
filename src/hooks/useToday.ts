import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

const startOfToday = () => DateTime.now().startOf('day');

/** Returns reactive today's date */
export const useToday = (): DateTime => {
    const [today, setToday] = useState(startOfToday);

    useEffect(
        function timerRearming() {
            const ms = DateTime.now().plus({ days: 1 }).startOf('day').diff(DateTime.now()).milliseconds;
            const timeout = setTimeout(() => setToday(startOfToday()), ms);
            return () => clearTimeout(timeout);
        },
        [today]
    );

    return today;
};
