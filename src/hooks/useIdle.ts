import { useEffect, useEffectEvent, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'touchstart'] as const;

export const useIdle = (timeoutMs: number, onIdle: () => void | Promise<void>) => {
    const timerRef = useRef<number | null>(null);
    const hiddenSinceRef = useRef<number | null>(null);

    const fireIdle = useEffectEvent(() => {
        onIdle();
    });

    useEffect(() => {
        const clearTimer = () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const startTimer = () => {
            clearTimer();
            timerRef.current = window.setTimeout(() => {
                fireIdle();
            }, timeoutMs);
        };

        const onActivity = () => {
            if (document.visibilityState === 'visible') {
                startTimer();
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                clearTimer();
                hiddenSinceRef.current = Date.now();
                return;
            }

            const hiddenSince = hiddenSinceRef.current;
            hiddenSinceRef.current = null;
            if (hiddenSince !== null && Date.now() - hiddenSince >= timeoutMs) {
                fireIdle();
                return;
            }
            startTimer();
        };

        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, onActivity, { passive: true });
        }
        document.addEventListener('visibilitychange', onVisibilityChange);

        startTimer();

        return () => {
            clearTimer();
            for (const event of ACTIVITY_EVENTS) {
                window.removeEventListener(event, onActivity);
            }
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [timeoutMs]);
};

