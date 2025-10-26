import { useState } from 'react';

export interface AuthState {
    isLoggedIn: boolean;
    tryToLogin: (password: string) => Promise<boolean>;
    logout: () => void;
}

export function useAuth() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const tryToLogin = async (): Promise<boolean> => {
        setIsLoggedIn(true);
        return true;
    };

    const logout = () => {
        setIsLoggedIn(false);
    };

    return {
        isLoggedIn,
        tryToLogin,
        logout,
    };
}