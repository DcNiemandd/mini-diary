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
        const databaseKey = await MyCrypto.decryptAESGCM(userAuth.databaseKey, encodedPassword);
        if (await MyCrypto.verifyKey(databaseKey, userAuth.hmac, encodedPassword) === false) {
            return false;
        }

        setDatabaseKey(databaseKey);
        return true;
    };

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
        decryptData
    };
}