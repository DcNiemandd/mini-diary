import { DateTime, Settings } from 'luxon';

const DEVCLOCK_EVENT = 'devclock-change';
const realNow = Settings.now;
let fakeOffsetMs: number | null = null;

const applyFake = (epochMs: number) => {
    fakeOffsetMs = epochMs - Date.now();
    Settings.now = () => Date.now() + (fakeOffsetMs ?? 0);
    window.dispatchEvent(new Event(DEVCLOCK_EVENT));
    console.log('[devClock] now =', DateTime.now().toISO());
};

const setNow = (iso: string) => {
    const dt = DateTime.fromISO(iso);
    if (!dt.isValid) {
        console.error('[devClock] invalid ISO:', iso, dt.invalidReason);
        return;
    }
    applyFake(dt.toMillis());
};

const reset = () => {
    fakeOffsetMs = null;
    Settings.now = realNow;
    window.dispatchEvent(new Event(DEVCLOCK_EVENT));
    console.log('[devClock] reset, now =', DateTime.now().toISO());
};

const now = () => DateTime.now().toISO();

declare global {
    interface Window {
        __diaryClock?: {
            setNow: typeof setNow;
            reset: typeof reset;
            now: typeof now;
        };
    }
}

window.__diaryClock = { setNow, reset, now };
console.log('[devClock] installed — window.__diaryClock available');

export const DEVCLOCK_CHANGE_EVENT = DEVCLOCK_EVENT;

