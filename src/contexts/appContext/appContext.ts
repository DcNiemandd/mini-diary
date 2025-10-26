import { createContext } from "react";
import type { AuthState } from "../../hooks/useAuth";
import type { ThemeSettings } from "../../hooks/useColorTheme";
import type { EntriesState } from "../../hooks/useEntries";


export interface AppContext {
    auth: AuthState;
    entries: EntriesState;
    settings: ThemeSettings;
}

export const AppContext = createContext<AppContext>({
    auth: {
        isLoggedIn: false,
        tryToLogin: (): Promise<boolean> => {
            throw new Error('Function not implemented.');
        },
        logout: (): void => {
            throw new Error('Function not implemented.');
        },
        isUser: false,
        encryptData: () => {
            throw new Error("Function not implemented.");
        },
        decryptData: () => {
            throw new Error("Function not implemented.");
        }
    },
    entries: {
        entries: null,
        updateTodaysEntry: (): void => {
            throw new Error('Function not implemented.');
        },
        todaysEntry: null,
    },
    settings: {
        colorScheme: "light",
        setColorScheme: () => {
            throw new Error("Function not implemented.");
        },
        customColor: undefined,
        setCustomColor: () => {
            throw new Error("Function not implemented.");
        },
        useCustomColor: false,
        setUseCustomColor: () => {
            throw new Error("Function not implemented.");
        }
    },
});