import { useState } from 'react';

export interface AuthState {
    isLoggedIn: boolean;
    tryToLogin: (password: string) => Promise<boolean>;
    logout: () => void;
}

export function useAuth() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tryToLogin = async (password: string): Promise<boolean> => {
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