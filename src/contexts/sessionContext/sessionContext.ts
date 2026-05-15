import { createContext } from 'react';

export interface SessionContextValue {
    userId: number;
    username: string;
    lastPatchNotesShown: number;
    changeUsername: (newUsername: string) => Promise<boolean>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    removeAccount: () => Promise<void>;
    markPatchNotesSeen: (version: number) => Promise<void>;
    encryptData: (data: string) => Promise<string>;
    decryptData: (gibberish: string) => Promise<string>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
