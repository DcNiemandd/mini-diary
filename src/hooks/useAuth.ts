import { useState } from 'react';
import { useLocalStorage } from './useStorage';

export interface AuthState {
    isUser: boolean;
    isLoggedIn: boolean;
    tryToLogin: (password: string) => Promise<boolean>;
    logout: () => void;
    encryptData: (data: string) => string;
    decryptData: (gibberish: string) => string;
}

interface UserAuth {
    key: string;
    salt: string;
}

export function useAuth() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userAuth, setUserAuth] = useLocalStorage<UserAuth | null>('state-auth-user', null);
    const isUser = userAuth !== null;

    const tryToLogin = async (password: string): Promise<boolean> => {
        if (!isUser) {
            setUserAuth({ salt: 'salt', key: password })
        }
        setIsLoggedIn(true);
        return true;
    };

    const logout = () => {
        setIsLoggedIn(false);
    };

    const encryptData = (data: string): string => {
        if (!userAuth) throw new Error('No user auth available for encryption');
        return data;
    }

    const decryptData = (gibberish: string): string => {
        if (!userAuth) throw new Error('No user auth available for encryption');
        return gibberish;
    }

    return {
        isLoggedIn,
        tryToLogin,
        logout,
        isUser,
        encryptData,
        decryptData
    };
}