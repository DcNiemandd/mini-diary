import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type UserRecord } from '../services/db';
import { migrateLocalStorageEntries, migrateLocalStorageUser } from '../services/migrateFromLocalStorage';
import {
    changeUserPassword,
    deleteUserAndEntries,
    generateUser,
    getCurrentUser,
    putUser,
    tryLogin,
} from '../services/usersService';
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
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
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
                const userId = MyCrypto.generaRandomString();
                const userAuth = await generateUser(userId, password);

                await putUser(userAuth);

                setUserAuth(userAuth);
                setDatabaseKey(userId);

                return true;
            } catch (e) {
                console.error(`Error creating new account. ${e}`);
                return false;
            }
        }

        let userKey: string | null = null;
        try {
            userKey = await tryLogin(userAuth, password);
        } catch {
            return false;
        }

        setDatabaseKey(userKey);

        // Migration from local storage
        await migrateLocalStorageEntries(userAuth.userId, (data) => MyCrypto.encryptAESGCM(data, userKey));

        return true;
    };

    const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
        if (!userAuth) return false;
        try {
            const newUser = await changeUserPassword(oldPassword, newPassword);
            setUserAuth(newUser);
            // databaseKey (userKey) stays valid — re-wrap preserved it
            return true;
        } catch (e) {
            console.error(`Password change failed. ${e}`);
            return false;
        }
    };

    const removeAccount = async () => {
        if (userAuth) {
            await deleteUserAndEntries(userAuth.userId);
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
        if (!databaseKey) throw new Error('No user auth available for decryption');
        return MyCrypto.decryptAESGCM(gibberish, databaseKey);
    };

    return {
        isInitializing,
        isLoggedIn: Boolean(databaseKey),
        userId: userAuth?.userId ?? null,
        tryToLogin,
        logout,
        isUser: userAuth !== null,
        encryptData,
        decryptData,
        changePassword,
        removeAccount,
    };
}
