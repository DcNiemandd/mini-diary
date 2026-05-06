import { type FC, type PropsWithChildren } from 'react';
import { useColorTheme } from '../../hooks/useColorTheme';
import { useLocalStorage } from '../../hooks/useStorage';
import { SettingsContext, type IdleTimeoutOption } from './settingsContext';

export const SettingsContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const themeSettings = useColorTheme();
    const [idleTimeout, setIdleTimeout] = useLocalStorage<IdleTimeoutOption>('state-idle-timeout', 5);

    const settings = {
        ...themeSettings,
        idleTimeout,
        setIdleTimeout,
    };

    return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};
