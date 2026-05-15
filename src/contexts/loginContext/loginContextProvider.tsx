import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FC, type PropsWithChildren } from 'react';
import type { UserRecord, UserSettings } from '../../services/db';
import {
    generateUser,
    getUserByUsername,
    putUser,
    renameUser,
    tryLogin,
    updateUserSettings,
    usernameExists,
} from '../../services/usersService';
import { MyCrypto } from '../../utils/crypto';
import { PATCH_NOTES_VERSION } from '../../hooks/usePatchNotes';
import { LoginContext, type LastUserHint, type LoginContextValue } from './loginContext';

const LAST_USERNAME_KEY = 'last-username';

const persistLastUsername = (username: string): void => {
    try {
        localStorage.setItem(LAST_USERNAME_KEY, username);
    } catch {
        // Non-fatal; next login retries.
    }
};

const clearLastUsername = (): void => {
    localStorage.removeItem(LAST_USERNAME_KEY);
};

export const LoginContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const [userAuth, setUserAuthState] = useState<UserRecord | null>(null);
    const [userKey, setUserKey] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [lastUserHint, setLastUserHint] = useState<LastUserHint | null>(null);
    const queryClient = useQueryClient();

    useEffect(function initialLoad() {
        const load = async () => {
            const lastUsername = localStorage.getItem(LAST_USERNAME_KEY);
            let loaded: UserRecord | null = null;
            if (lastUsername) {
                loaded = await getUserByUsername(lastUsername);
                if (!loaded) clearLastUsername();
            }
            if (loaded) {
                setUserAuthState(loaded);
                setLastUserHint({ username: loaded.username, isSentinel: loaded.username === '' });
            } else if (await usernameExists('')) {
                setLastUserHint({ username: '', isSentinel: true });
            } else {
                setLastUserHint(null);
            }
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

        setUserAuthState(target);
        setUserKey(resolvedUserKey);
        persistLastUsername(target.username);
        setLastUserHint({ username: target.username, isSentinel: target.username === '' });
        return true;
    };

    const signup = async (username: string, password: string): Promise<boolean> => {
        if (!username) return false;
        if (await usernameExists(username)) return false;
        try {
            const newUserKey = MyCrypto.generaRandomString();
            const newUser = await generateUser(newUserKey, password, username);
            // New accounts should not see historic patch notes — mark every
            // existing version as already-seen at signup time.
            newUser.lastPatchNotesShown = PATCH_NOTES_VERSION;
            const stored = await putUser(newUser);
            setUserAuthState(stored);
            setUserKey(newUserKey);
            persistLastUsername(stored.username);
            setLastUserHint({ username: stored.username, isSentinel: false });
            return true;
        } catch (e) {
            console.error(`Signup failed. ${e}`);
            return false;
        }
    };

    const claimSentinel = async (newUsername: string, password: string): Promise<boolean> => {
        if (!newUsername) return false;
        const sentinel = await getUserByUsername('');
        if (!sentinel) return false;
        if (await usernameExists(newUsername)) return false;

        let resolvedUserKey: string;
        try {
            resolvedUserKey = await tryLogin(sentinel, password);
        } catch {
            return false;
        }

        let renamed: UserRecord;
        try {
            renamed = await renameUser(sentinel.id, newUsername);
        } catch (e) {
            console.error(`Claim sentinel rename failed. ${e}`);
            return false;
        }

        setUserAuthState(renamed);
        setUserKey(resolvedUserKey);
        persistLastUsername(newUsername);
        setLastUserHint({ username: newUsername, isSentinel: false });
        return true;
    };

    const logout = (): void => {
        // Cache is kept on purpose — pre-login paint and the returning-user
        // hint both depend on it surviving a logout.
        setUserKey(null);
        queryClient.clear();
    };

    const forgetLastUser = (): void => {
        clearLastUsername();
        setLastUserHint(null);
    };

    const setUserAuth = (next: UserRecord): void => {
        const oldUsername = userAuth?.username;
        setUserAuthState(next);
        setLastUserHint({ username: next.username, isSentinel: next.username === '' });
        if (oldUsername !== undefined && oldUsername !== next.username) {
            const pointerMatchedOld = localStorage.getItem(LAST_USERNAME_KEY) === oldUsername;
            if (pointerMatchedOld) persistLastUsername(next.username);
        }
    };

    const changeSettings = async (partial: Partial<UserSettings>): Promise<boolean> => {
        if (!userAuth || userAuth.id === undefined) return false;
        const merged: UserSettings = { ...userAuth.settings, ...partial };
        try {
            const next = await updateUserSettings(userAuth.id, merged);
            setUserAuth(next);
            return true;
        } catch (e) {
            console.error(`Changing settings failed. ${e}`);
            return false;
        }
    };

    const endSession = (): void => {
        const removedUsername = userAuth?.username;
        setUserAuthState(null);
        setUserKey(null);
        if (removedUsername !== undefined && localStorage.getItem(LAST_USERNAME_KEY) === removedUsername) {
            clearLastUsername();
            setLastUserHint(null);
        }
        queryClient.clear();
    };

    const value: LoginContextValue = {
        isInitializing,
        isLoggedIn: Boolean(userKey),
        lastUserHint,
        settings: userAuth?.settings ?? null,
        tryToLogin,
        signup,
        claimSentinel,
        changeSettings,
        logout,
        forgetLastUser,
        internals: {
            userAuth,
            userKey,
            setUserAuth,
            endSession,
        },
    };

    return <LoginContext.Provider value={value}>{children}</LoginContext.Provider>;
};

