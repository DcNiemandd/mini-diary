import { useState, type FC, type PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useColorTheme } from '../../hooks/useColorTheme';
import { AppContext } from './appContext';

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
