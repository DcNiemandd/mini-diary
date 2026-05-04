import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';

export interface AuthState {
    isUser: boolean;
    isInitializing: boolean;
    isLoggedIn: boolean;
    userId: number | null;
    tryToLogin: (password: string) => Promise<boolean>;
    logout: () => void;
    encryptData: (data: string) => Promise<string>;
    decryptData: (gibberish: string) => Promise<string>;
    removeAccount: () => void;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

export function useAuth(): AuthState {
    const auth = useContext(AuthContext);
    if (!auth) throw new Error("useAuth has to be used inside it's context");
    return auth;
}
