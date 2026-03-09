import { useCallback, useEffect, useEffectEvent, useMemo, useState, type Dispatch, type SetStateAction } from "react";




export const useStorage = <T,>(key: string, initialValue: T, storage: Storage): [T, Dispatch<SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = storage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const onLoadFromStorage = useEffectEvent(() => {
        try {
            const item = storage.getItem(key);
            setStoredValue(item ? JSON.parse(item) : initialValue);
        } catch {
            setStoredValue(initialValue);
        }
    });

    useEffect(() => {
        onLoadFromStorage();
    }, [key]);

    const setValue: Dispatch<SetStateAction<T>> = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            storage.setItem(key, JSON.stringify(valueToStore));
            setStoredValue(valueToStore);
        } catch {
            // Ignore write errors
        }
    }, [key, storage, storedValue]);

    return useMemo(() => [storedValue, setValue], [storedValue, setValue]);
}


export const useLocalStorage = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => useStorage(key, initialValue, window.localStorage);
export const useSessionStorage = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => useStorage(key, initialValue, window.sessionStorage);
