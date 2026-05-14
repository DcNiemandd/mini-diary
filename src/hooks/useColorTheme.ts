import { useEffect, type CSSProperties, type Dispatch } from 'react';
import type { ColorScheme } from '../services/db';
import { useLocalStorage } from './useStorage';

type Theme = ColorScheme;
type Color = CSSProperties['color'] | undefined;

export interface ThemeSettings {
    colorScheme: Theme;
    setColorScheme: Dispatch<Theme>;
    customColor: Color;
    setCustomColor: Dispatch<Color>;
    isUseCustomColor: boolean;
    setIsUseCustomColor: Dispatch<boolean>;
}

export const useColorTheme = (): ThemeSettings => {
    const [theme, setTheme] = useLocalStorage<Theme>('state-theme-theme', 'system');
    const [customColor, setCustomColor] = useLocalStorage<CSSProperties['color'] | undefined>(
        'state-theme-custom-color',
        'oklch(0.76 0.2 20)'
    );
    const [isUseCustomColor, setIsUseCustomColor] = useLocalStorage<boolean>('state-theme-use-custom-color', false);

    const root = window.document.documentElement;

    useEffect(
        function updateThemeOnRoot() {
            switch (theme) {
                case 'light':
                    root.style.colorScheme = 'light';
                    break;
                case 'dark':
                    root.style.colorScheme = 'dark';
                    break;
                case 'system':
                    root.style.colorScheme = 'dark light';
            }
        },
        [theme, root]
    );

    useEffect(
        function updateCustomColorOnRoo() {
            if (customColor && isUseCustomColor) {
                root.style.setProperty('--custom-color', customColor);
            } else {
                root.style.removeProperty('--custom-color');
            }
        },
        [customColor, root.style, isUseCustomColor]
    );

    return {
        colorScheme: theme,
        setColorScheme: setTheme,
        customColor,
        setCustomColor,
        isUseCustomColor,
        setIsUseCustomColor,
    };
};
