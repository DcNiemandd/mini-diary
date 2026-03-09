import { createContext, type CSSProperties, type Dispatch } from 'react';
import type { Color, Theme } from '../../hooks/useColorTheme';

export interface SettingsContextValue {
    colorScheme: Theme;
    setColorScheme: Dispatch<Theme>;
    customColor: Color;
    setCustomColor: Dispatch<CSSProperties['color'] | undefined>;
    useCustomColor: boolean;
    setUseCustomColor: Dispatch<boolean>;
}

export const SettingsContext = createContext<SettingsContextValue>({} as SettingsContextValue);
