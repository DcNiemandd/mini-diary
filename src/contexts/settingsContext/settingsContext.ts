import { createContext, type Dispatch } from 'react';
import type { ThemeSettings } from '../../hooks/useColorTheme';

export const IDLE_TIMEOUT_OPTIONS = [1, 3, 5, 15, 30] as const;
export type IdleTimeoutOption = (typeof IDLE_TIMEOUT_OPTIONS)[number];

export interface IdleTimeoutSettings {
    idleTimeout: IdleTimeoutOption;
    setIdleTimeout: Dispatch<IdleTimeoutOption>;
}

export type SettingsContextValue = ThemeSettings & IdleTimeoutSettings;

export const SettingsContext = createContext<SettingsContextValue>({} as SettingsContextValue);
