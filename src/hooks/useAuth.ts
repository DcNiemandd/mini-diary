import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type UserRecord } from '../services/db';
import { migrateLocalStorageEntries, migrateLocalStorageUser } from '../services/migrateFromLocalStorage';
import { deleteUserAndEntries, getCurrentUser, putUser } from '../services/usersService';
import { MyCrypto } from '../utils/crypto';

export interface AuthState {
    isUser: boolean;
    isInitializing: boolean;
    isLoggedIn: boolean;
    userId: string | null;
    tryToLogin: (password: string) => Promise<boolean>;
    logout: () => void;
    encryptData: (data: string) => Promise<string>;
    decryptData: (gibberish: string) => Promise<string>;
    removeAccount: () => void;
}

export function useAuth(): AuthState {
    const [userAuth, setUserAuth] = useState<UserRecord | null>(null);
    const [databaseKey, setDatabaseKey] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const queryClient = useQueryClient();

    useEffect(function userAuthLoad() {
        const userAuthLoad = async () => {
            // Mutation from local storage to V0
            await migrateLocalStorageUser();
            // Load user auth from IndexedDB
            setUserAuth(await getCurrentUser());
            setIsInitializing(false);
        };

        userAuthLoad();
    }, []);

    const tryToLogin = async (password: string): Promise<boolean> => {
        if (userAuth === null) {
            try {
                const salt = MyCrypto.generaRandomString();
                const encodedPassword = await MyCrypto.encodePassword(password, salt);
                const databaseKey = MyCrypto.generaRandomString();
                const encodedDatabaseKey = await MyCrypto.encryptAESGCM(databaseKey, encodedPassword);
                const hmac = await MyCrypto.generateHMAC(databaseKey, encodedPassword);

                const userAuth: UserRecord = {
                    databaseKey: encodedDatabaseKey,
                    salt,
                    hmac,
                };
                await putUser(userAuth);
                setUserAuth(userAuth);
                setDatabaseKey(databaseKey);

                return true;
            } catch (e) {
                console.error(`Error creating new account. ${e}`);
                return false;
            }
        }

        const encodedPassword = await MyCrypto.encodePassword(password, userAuth.salt);
        let plainKey: string | null = null;
        try {
            plainKey = await MyCrypto.decryptAESGCM(userAuth.databaseKey, encodedPassword);
        } catch {
            console.error('Cannot decrypt database key');
            return false;
        }

        if ((await MyCrypto.verifyKey(plainKey, userAuth.hmac, encodedPassword)) === false) {
            console.error('HMAC verification failed');
            return false;
        }

        setDatabaseKey(plainKey);

        // Migration from local storage
        await migrateLocalStorageEntries(userAuth.databaseKey, (data) => MyCrypto.encryptAESGCM(data, plainKey));

        return true;
    };

    const removeAccount = async () => {
        if (userAuth) {
            await deleteUserAndEntries(userAuth.databaseKey);
        }
        setUserAuth(null);
        setDatabaseKey(null);
        queryClient.clear();
    };

    const logout = () => {
        setDatabaseKey(null);
        queryClient.clear();
    };

    const encryptData = async (data: string): Promise<string> => {
        if (!databaseKey) throw new Error('No user auth available for encryption');
        return MyCrypto.encryptAESGCM(data, databaseKey);
    };

    const decryptData = async (gibberish: string): Promise<string> => {
        if (!databaseKey) throw new Error('No user auth available for encryption');
        return MyCrypto.decryptAESGCM(gibberish, databaseKey);
    };

    return {
        isInitializing,
        isLoggedIn: Boolean(databaseKey),
        userId: userAuth?.databaseKey ?? null,
        tryToLogin,
        logout,
        isUser: userAuth !== null,
        encryptData,
        decryptData,
        removeAccount,
    };
}
