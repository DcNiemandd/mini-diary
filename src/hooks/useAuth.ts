import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import type { UserSettings } from '../services/db';

export interface AuthState {
    isUser: boolean;
    isInitializing: boolean;
    isLoggedIn: boolean;
    userId: number | null;
    username: string | null;
    tryToLogin: (username: string, password: string) => Promise<boolean>;
    signup: (username: string, password: string) => Promise<boolean>;

    changeUsername: (newUsername: string) => Promise<boolean>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    removeAccount: () => Promise<void>;
    logout: () => void;
    forgetLastUser: () => void;
    // User settings
    settings: UserSettings | null;
    changeSettings: (newSettings: Partial<UserSettings>) => Promise<boolean>;
    // Encryption functions
    encryptData: (data: string) => Promise<string>;
    decryptData: (gibberish: string) => Promise<string>;
}

export function useAuth(): AuthState {
    const auth = useContext(AuthContext);
    if (!auth) throw new Error("useAuth has to be used inside it's context");
    return auth;
}
