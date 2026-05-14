import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FC, type PropsWithChildren } from 'react';
import type { UserRecord, UserSettings } from '../../services/db';
import {
    changeUserPassword,
    deleteUserAndEntries,
    generateUser,
    getCurrentUser,
    getUserByUsername,
    putUser,
    renameUser,
    tryLogin,
    updateUserSettings,
    usernameExists,
} from '../../services/usersService';
import { MyCrypto } from '../../utils/crypto';
import { AuthContext } from './authContext';

const LAST_USERNAME_KEY = 'last-username';
const CACHED_THEME_KEY = 'cached-theme-theme';
const CACHED_CUSTOM_COLOR_KEY = 'cached-theme-custom-color';
const CACHED_USE_CUSTOM_COLOR_KEY = 'cached-theme-use-custom-color';

const persistLoginCache = (user: UserRecord): void => {
    try {
        localStorage.setItem(LAST_USERNAME_KEY, user.username);
        localStorage.setItem(CACHED_THEME_KEY, JSON.stringify(user.settings.colorScheme));
        localStorage.setItem(CACHED_CUSTOM_COLOR_KEY, JSON.stringify(user.settings.customColor));
        localStorage.setItem(CACHED_USE_CUSTOM_COLOR_KEY, JSON.stringify(user.settings.isUseCustomColor));
    } catch {
        // Non-fatal; next login retries.
    }
};

const clearLoginCache = (): void => {
    localStorage.removeItem(LAST_USERNAME_KEY);
    localStorage.removeItem(CACHED_THEME_KEY);
    localStorage.removeItem(CACHED_CUSTOM_COLOR_KEY);
    localStorage.removeItem(CACHED_USE_CUSTOM_COLOR_KEY);
};

export const AuthContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const [userAuth, setUserAuth] = useState<UserRecord | null>(null);
    const [userKey, setUserKey] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const queryClient = useQueryClient();

    useEffect(function userAuthLoad() {
        const load = async () => {
            // Prefer the last-login pointer; fall back to the highest-id row
            // so a post-v3 upgrade (no pointer yet) still surfaces a user.
            const lastUsername = localStorage.getItem(LAST_USERNAME_KEY);
            let loaded: UserRecord | null = null;
            if (lastUsername) {
                loaded = await getUserByUsername(lastUsername);
                if (!loaded) localStorage.removeItem(LAST_USERNAME_KEY);
            }
            if (!loaded) loaded = await getCurrentUser();
            setUserAuth(loaded);
            setIsInitializing(false);
        };

        load();
    }, []);

    const tryToLogin = async (username: string, password: string): Promise<boolean> => {
        const target = await getUserByUsername(username);
        if (!target) return false;

        let resolvedUserKey: string;
        try {
            resolvedUserKey = await tryLogin(target, password);
        } catch {
            return false;
        }

        setUserAuth(target);
        setUserKey(resolvedUserKey);
        persistLoginCache(target);
        return true;
    };

    const signup = async (username: string, password: string): Promise<boolean> => {
        if (!username) return false;
        if (await usernameExists(username)) return false;
        try {
            const newUserKey = MyCrypto.generaRandomString();
            const newUser = await generateUser(newUserKey, password, username);
            const stored = await putUser(newUser);
            setUserAuth(stored);
            setUserKey(newUserKey);
            persistLoginCache(stored);
            return true;
        } catch (e) {
            console.error(`Signup failed. ${e}`);
            return false;
        }
    };

    const changeSettings = async (newSettings: Partial<UserSettings>): Promise<boolean> => {
        if (!userAuth || userAuth.id === undefined) return false;
        const oldUsername = userAuth.username;
        const mergedSettings: UserSettings = { ...userAuth.settings, ...newSettings };
        let next: UserRecord = userAuth;

        try {
            next = await updateUserSettings(userAuth.id, mergedSettings);
        } catch (e) {
            console.error(`Changing settings failed. ${e}`);
            return false;
        }

        setUserAuth(next);

        const pointerMatchedOld = localStorage.getItem(LAST_USERNAME_KEY) === oldUsername;
        if (pointerMatchedOld) persistLoginCache(next);
        return true;
    };

    const changeUsername = async (newUsername: string): Promise<boolean> => {
        if (!userAuth || userAuth.id === undefined) return false;
        const oldUsername = userAuth.username;

        if (newUsername === undefined || newUsername === oldUsername) return false;

        let next: UserRecord = userAuth;
        try {
            next = await renameUser(userAuth.id, newUsername);
        } catch (e) {
            console.error(`Changing username failed. ${e}`);
            return false;
        }

        setUserAuth(next);

        const pointerMatchedOld = localStorage.getItem(LAST_USERNAME_KEY) === oldUsername;
        if (pointerMatchedOld) persistLoginCache(next);
        return true;
    };

    const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
        if (!userAuth || userAuth.id === undefined) return false;
        try {
            const updated = await changeUserPassword(userAuth as Required<UserRecord>, oldPassword, newPassword);
            setUserAuth(updated);
            return true;
        } catch (e) {
            console.error(`Password change failed. ${e}`);
            return false;
        }
    };

    const removeAccount = async (): Promise<void> => {
        if (userAuth?.id !== undefined) {
            const wasLastLogin = localStorage.getItem(LAST_USERNAME_KEY) === userAuth.username;
            await deleteUserAndEntries(userAuth.id);
            if (wasLastLogin) clearLoginCache();
        }
        setUserAuth(null);
        setUserKey(null);
        queryClient.clear();
    };

    const logout = (): void => {
        // Cache is kept on purpose — pre-login paint and the returning-user
        // hint both depend on it surviving a logout.
        setUserKey(null);
        queryClient.clear();
    };

    const encryptData = async (data: string): Promise<string> => {
        if (!userKey) throw new Error('No user auth available for encryption');
        return MyCrypto.encryptAESGCM(data, userKey);
    };

    const decryptData = async (gibberish: string): Promise<string> => {
        if (!userKey) throw new Error('No user auth available for decryption');
        return MyCrypto.decryptAESGCM(gibberish, userKey);
    };

    const auth = {
        isInitializing,
        isLoggedIn: Boolean(userKey),
        isUser: userAuth !== null,
        userId: userAuth?.id ?? null,
        username: userAuth?.username ?? null,
        settings: userAuth?.settings ?? null,
        tryToLogin,
        signup,
        changeSettings,
        changeUsername,
        changePassword,
        removeAccount,
        logout,
        encryptData,
        decryptData,
    };
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

