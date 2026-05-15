import { createContext } from 'react';
import type { UserRecord, UserSettings } from '../../services/db';

export type LastUserHint = { username: string; isSentinel: boolean };

export interface LoginContextValue {
    isInitializing: boolean;
    isLoggedIn: boolean;
    lastUserHint: LastUserHint | null;
    settings: UserSettings | null;
    tryToLogin: (username: string, password: string) => Promise<boolean>;
    signup: (username: string, password: string) => Promise<boolean>;
    claimSentinel: (newUsername: string, password: string) => Promise<boolean>;
    changeSettings: (partial: Partial<UserSettings>) => Promise<boolean>;
    logout: () => void;
    forgetLastUser: () => void;
    // Session-only state + write primitives for SessionContextProvider. Nested to
    // discourage free use — only the session provider should touch this.
    internals: {
        userAuth: UserRecord | null;
        userKey: string | null;
        setUserAuth: (next: UserRecord) => void;
        endSession: () => void;
    };
}

export const LoginContext = createContext<LoginContextValue | null>(null);
