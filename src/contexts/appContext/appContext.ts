import { createContext } from "react";
import type { AuthState } from "../../hooks/useAuth";
import type { ThemeSettings } from "../../hooks/useColorTheme";


export interface AppContext {
    auth: AuthState;
    entries: {
        entries: Record<string, string> | null;
        updateTodaysEntry: (content: string) => void;
        todaysEntry: string | null;
    };
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