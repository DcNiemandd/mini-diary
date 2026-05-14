import { createContext } from 'react';

export type LastUserHint = { username: string; isSentinel: boolean };

export interface LoginContextValue {
    isInitializing: boolean;
    isLoggedIn: boolean;
    lastUserHint: LastUserHint | null;
    tryToLogin: (username: string, password: string) => Promise<boolean>;
    signup: (username: string, password: string) => Promise<boolean>;
    claimSentinel: (newUsername: string, password: string) => Promise<boolean>;
    logout: () => void;
    forgetLastUser: () => void;
}

export const LoginContext = createContext<LoginContextValue | null>(null);
