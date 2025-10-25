import { createContext, useState, type FC, type PropsWithChildren } from 'react';
import { useAuth, type AuthState } from '../hooks/useAuth';
import { useColorTheme, type ColorSettings } from '../hooks/useColorTheme';

export interface AppContext {
    auth: AuthState;
    entries: {
        entries: Record<string, string> | null;
        updateTodaysEntry: (content: string) => void;
        todaysEntry: string | null;
    };
    settings: ColorSettings;
}

const AppContext = createContext<AppContext>({
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
        colorScheme: 'system',
        setColorScheme: (): void => {
            throw new Error('Function not implemented.');
        },
    },
});

export const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const auth = useAuth();
    const colorSettings = useColorTheme();

    const [todaysEntry, setTodaysEntry] = useState<string | null>(null);

    const state: AppContext = {
        auth,
        entries: {
            entries: null,
            updateTodaysEntry: setTodaysEntry,
            todaysEntry,
        },
        settings: colorSettings,
    };

    return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
};
