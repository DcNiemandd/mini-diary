import { createContext } from 'react';

export interface AuthContextValue {
    isUser: boolean;
    isLoggedIn: boolean;
    databaseKeyId: string | null;
    tryToLogin: (password: string) => Promise<boolean>;
    logout: () => void;
    removeAccount: () => void;
    encryptData: (data: string) => Promise<string>;
    decryptData: (data: string) => Promise<string>;
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
