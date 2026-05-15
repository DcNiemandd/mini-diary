import { type FC, type PropsWithChildren } from 'react';
import { useLogin } from '../../hooks/useLogin';
import type { UserRecord } from '../../services/db';
import {
    changeUserPassword,
    deleteUserAndEntries,
    renameUser,
    updateUserPatchNotesShown,
} from '../../services/usersService';
import { MyCrypto } from '../../utils/crypto';
import { SessionContext, type SessionContextValue } from './sessionContext';

export const SessionContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const login = useLogin();
    const { userAuth, userKey } = login.internals;

    if (!userAuth || userAuth.id === undefined || !userKey) {
        throw new Error('SessionContextProvider mounted without active session — Router invariant violated');
    }

    const activeUser = userAuth as Required<UserRecord>;

    const changeUsername = async (newUsername: string): Promise<boolean> => {
        if (newUsername === undefined || newUsername === activeUser.username) return false;
        try {
            const next = await renameUser(activeUser.id, newUsername);
            login.internals.setUserAuth(next);
            return true;
        } catch (e) {
            console.error(`Changing username failed. ${e}`);
            return false;
        }
    };

    const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
        try {
            const updated = await changeUserPassword(activeUser, oldPassword, newPassword);
            login.internals.setUserAuth(updated);
            return true;
        } catch (e) {
            console.error(`Password change failed. ${e}`);
            return false;
        }
    };

    const removeAccount = async (): Promise<void> => {
        await deleteUserAndEntries(activeUser.id);
        login.internals.endSession();
    };

    const markPatchNotesSeen = async (version: number): Promise<void> => {
        if (activeUser.lastPatchNotesShown >= version) return;
        try {
            const next = await updateUserPatchNotesShown(activeUser.id, version);
            login.internals.setUserAuth(next);
        } catch (e) {
            console.error(`Persisting patch-notes progress failed. ${e}`);
        }
    };

    const encryptData = async (data: string): Promise<string> => {
        return MyCrypto.encryptAESGCM(data, userKey);
    };

    const decryptData = async (gibberish: string): Promise<string> => {
        return MyCrypto.decryptAESGCM(gibberish, userKey);
    };

    const value: SessionContextValue = {
        userId: activeUser.id,
        username: activeUser.username,
        lastPatchNotesShown: activeUser.lastPatchNotesShown,
        changeUsername,
        changePassword,
        removeAccount,
        markPatchNotesSeen,
        encryptData,
        decryptData,
    };

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

