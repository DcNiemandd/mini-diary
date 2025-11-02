import { useState } from 'react';
import { MyCrypto } from '../utils/crypto';
import { useLocalStorage } from './useStorage';

export interface AuthState {
    isUser: boolean;
    isLoggedIn: boolean;
    tryToLogin: (password: string) => Promise<boolean>;
    logout: () => void;
    encryptData: (data: string) => Promise<string>;
    decryptData: (gibberish: string) => Promise<string>;
    removeAccount: () => void;
}

interface UserAuth {
    /** encoded DB key */
    databaseKey: string;
    /** password key salt */
    salt: string;
    /** DB key hmac */
    hmac: string;
}

export function useAuth() {
    const [userAuth, setUserAuth] = useLocalStorage<UserAuth | null>('state-auth-user', null);
    const [databaseKey, setDatabaseKey] = useState<string | null>(null);
    const isLoggedIn = Boolean(databaseKey);
    const isUser = userAuth !== null;

    const tryToLogin = async (password: string): Promise<boolean> => {
        if (userAuth === null) {
            const salt = MyCrypto.generaRandomString();
            const encodedPassword = await MyCrypto.encodePassword(password, salt);
            const databaseKey = MyCrypto.generaRandomString();
            const encodedDatabaseKey = await MyCrypto.encryptAESGCM(databaseKey, encodedPassword);
            const hmac = await MyCrypto.generateHMAC(databaseKey, encodedPassword);

            setDatabaseKey(databaseKey);
            setUserAuth({
                databaseKey: encodedDatabaseKey,
                salt,
                hmac
            });
            return true;
        }

        const encodedPassword = await MyCrypto.encodePassword(password, userAuth.salt);
        let databaseKey: string | null = null;
        try {
            databaseKey = await MyCrypto.decryptAESGCM(userAuth.databaseKey, encodedPassword);
        } catch {
            console.error('Cannot decrypt database key');
            return false;
        }

        if (await MyCrypto.verifyKey(databaseKey, userAuth.hmac, encodedPassword) === false) {
            console.error('HMAC verification failed');
            return false;
        }

        setDatabaseKey(databaseKey);
        return true;
    };

    const removeAccount = () => {
        setUserAuth(null);
        setDatabaseKey(null);
        // TODO: clear entries data from useEntries
        const existing = localStorage.getItem('state-entries-data');
        if (existing) {
            localStorage.setItem(`state-entries-data-deleted-${(new Date()).toISOString()}`, existing);
            localStorage.setItem('state-entries-data', '');
        }
    }

    const logout = () => {
        setDatabaseKey(null);
    };

    const encryptData = async (data: string): Promise<string> => {
        if (!databaseKey) throw new Error('No user auth available for encryption');
        return MyCrypto.encryptAESGCM(data, databaseKey);
    }

    const decryptData = async (gibberish: string): Promise<string> => {
        if (!databaseKey) throw new Error('No user auth available for encryption');
        return MyCrypto.decryptAESGCM(gibberish, databaseKey);
    }

    return {
        isLoggedIn,
        tryToLogin,
        logout,
        isUser,
        encryptData,
        decryptData,
        removeAccount
    };
}