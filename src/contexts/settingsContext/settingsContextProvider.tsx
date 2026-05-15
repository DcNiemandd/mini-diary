import { type FC, type PropsWithChildren } from 'react';
import { useColorTheme } from '../../hooks/useColorTheme';
import { useLogin } from '../../hooks/useLogin';
import { defaultUserSettings } from '../../services/db';
import { SettingsContext, type IdleTimeoutOption } from './settingsContext';

export const SettingsContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const login = useLogin();

    const themeSettings = useColorTheme(login.settings ?? undefined, login.changeSettings);
    const idleTimeout: IdleTimeoutOption = login.settings?.idleTimeout ?? defaultUserSettings().idleTimeout;
    const setIdleTimeout = (value: IdleTimeoutOption) => {
        void login.changeSettings({ idleTimeout: value });
    };

    const settings = {
        ...themeSettings,
        idleTimeout,
        setIdleTimeout,
    };

    return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};
