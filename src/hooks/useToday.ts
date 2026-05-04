import { DateTime } from 'luxon';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

const startOfToday = () => DateTime.now().startOf('day');

/** Returns reactive today's date. Optional callback fires when the day rolls over. */
export const useToday = (onChange?: (today: DateTime, previous: DateTime) => void): DateTime => {
    const [today, setToday] = useState(startOfToday);
    const onChangeEvent = useEffectEvent((next: DateTime, prev: DateTime) => {
        onChange?.(next, prev);
    });
    const prevRef = useRef(today);

    useEffect(
        function notifyDayChange() {
            const prev = prevRef.current;
            if (!prev.equals(today)) {
                prevRef.current = today;
                onChangeEvent(today, prev);
            }
        },
        [today]
    );

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
