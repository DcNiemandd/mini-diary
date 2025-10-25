import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";




export const useStorage = <T,>(key: string, initialValue: T, storage: Storage): [T, Dispatch<SetStateAction<T>>] => {
    const getValue = useCallback((key: string, initialValue: T): T => {
        try {
            const item = storage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    }, [storage])

    const [storedValue, setStoredValue] = useState<T>(() => {
        return getValue(key, initialValue);
    });

    const setValue: Dispatch<SetStateAction<T>> = value => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            storage.setItem(key, JSON.stringify(valueToStore));
        } catch {
            // Ignore write errors
        }
    };

    useEffect(() => {
        setStoredValue(getValue(key, initialValue));
    }, [getValue, initialValue, key])

    return [storedValue, setValue];
}


export const useLocalStorage = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => useStorage(key, initialValue, window.localStorage);
export const useSessionStorage = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => useStorage(key, initialValue, window.sessionStorage);