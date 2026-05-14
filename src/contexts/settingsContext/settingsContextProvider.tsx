import { type FC, type PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useColorTheme } from '../../hooks/useColorTheme';
import { defaultUserSettings } from '../../services/db';
import { SettingsContext, type IdleTimeoutOption } from './settingsContext';

export const SettingsContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const themeSettings = useColorTheme();
    const auth = useAuth();
    const idleTimeout: IdleTimeoutOption = auth.settings?.idleTimeout ?? defaultUserSettings().idleTimeout;
    const setIdleTimeout = (value: IdleTimeoutOption) => {
        void auth.changeSettings({ idleTimeout: value });
    };

    const settings = {
        ...themeSettings,
        idleTimeout,
        setIdleTimeout,
    };

    return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};
