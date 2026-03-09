import { type FC, type PropsWithChildren } from 'react';
import { useColorTheme } from '../../hooks/useColorTheme';
import { SettingsContext } from './settingsContext';

export const SettingsContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const settings = useColorTheme();
    return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};
