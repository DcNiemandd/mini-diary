import { useCallback, useEffect, useEffectEvent, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

export const useStorage = <T>(key: string, initialValue: T, storage: Storage): [T, Dispatch<SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        let item: string | null;
        try {
            item = storage.getItem(key);
        } catch {
            return initialValue;
        }
        return item ? JSON.parse(item) : initialValue;
    });

    const onLoadFromStorage = useEffectEvent(() => {
        let item: string | null;
        try {
            item = storage.getItem(key);
        } catch {
            setStoredValue(initialValue);
            return;
        }
        setStoredValue(item ? JSON.parse(item) : initialValue);
    });

    useEffect(() => {
        onLoadFromStorage();
    }, [key]);

    const setValue: Dispatch<SetStateAction<T>> = useCallback(
        (value) => {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            try {
                storage.setItem(key, JSON.stringify(valueToStore));
                setStoredValue(valueToStore);
            } catch {
                // Ignore write errors
            }
        },
        [key, storage, storedValue]
    );

    return useMemo(() => [storedValue, setValue], [storedValue, setValue]);
};

export const useLocalStorage = <T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] =>
    useStorage(key, initialValue, window.localStorage);
export const useSessionStorage = <T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] =>
    useStorage(key, initialValue, window.sessionStorage);
