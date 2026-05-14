import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FC, type PropsWithChildren } from 'react';
import type { UserRecord } from '../../services/db';
import {
    generateUser,
    getUserByUsername,
    putUser,
    renameUser,
    tryLogin,
    usernameExists,
} from '../../services/usersService';
import { MyCrypto } from '../../utils/crypto';
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
    // `userAuth` write-only in Phase 1; SessionProvider consumes it in Phase 2.
    const [, setUserAuth] = useState<UserRecord | null>(null);
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
                setUserAuth(loaded);
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

        setUserAuth(target);
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
            const stored = await putUser(newUser);
            setUserAuth(stored);
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

        setUserAuth(renamed);
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

    const value: LoginContextValue = {
        isInitializing,
        isLoggedIn: Boolean(userKey),
        lastUserHint,
        tryToLogin,
        signup,
        claimSentinel,
        logout,
        forgetLastUser,
    };

    return <LoginContext.Provider value={value}>{children}</LoginContext.Provider>;
};

