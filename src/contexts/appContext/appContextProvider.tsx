import { type FC, type PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useColorTheme } from '../../hooks/useColorTheme';
import { useEntries } from '../../hooks/useEntries';
import { AppContext } from './appContext';

export const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const auth = useAuth();
    const colorSettings = useColorTheme();
    const entries = useEntries({
        decryptData: auth.isLoggedIn ? auth.decryptData : (data: string) => data,
        encryptData: auth.isLoggedIn ? auth.encryptData : (data: string) => data,
    });

    const state: AppContext = {
        auth,
        entries,
        settings: colorSettings,
    };

    return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
};
