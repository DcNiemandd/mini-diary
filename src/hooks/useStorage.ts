import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";




export const useStorage = <T,>(key: string, initialValue: T, storage: Storage): [T, Dispatch<SetStateAction<T>>] => {
    const initialValueRef = useRef(initialValue);

    const getValue = useCallback((key: string): T => {
        try {
            const item = storage.getItem(key);
            return item ? JSON.parse(item) : initialValueRef.current;
        } catch {
            return initialValueRef.current;
        }
    }, [storage])

    const [storedValue, setStoredValue] = useState<T>(() => {
        return getValue(key);
    });

    const setValue: Dispatch<SetStateAction<T>> = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            storage.setItem(key, JSON.stringify(valueToStore));
            setStoredValue(valueToStore);
        } catch {
            // Ignore write errors
        }
    }, [key, storage, storedValue]);

    useEffect(() => {
        setStoredValue(getValue(key));
    }, [getValue, key])

    return useMemo(() => [storedValue, setValue], [storedValue, setValue]);
}


export const useLocalStorage = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => useStorage(key, initialValue, window.localStorage);
export const useSessionStorage = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => useStorage(key, initialValue, window.sessionStorage);