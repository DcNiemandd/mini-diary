import { useCallback, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDebounceCall = <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
    const timeoutRef = useRef<number | null>(null);

    const debouncedFn = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = window.setTimeout(() => {
                fn(...args);
            }, delay);
        },
        [fn, delay]
    ) as T;

    return debouncedFn;
};
