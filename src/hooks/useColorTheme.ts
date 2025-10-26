import { useEffect, type CSSProperties, type Dispatch } from "react";
import { useLocalStorage } from "./useStorage";

export type Theme = 'light' | 'dark' | 'system';
export type Color = CSSProperties['color'] | undefined;

export interface ThemeSettings {
    colorScheme: Theme;
    setColorScheme: Dispatch<Theme>;
    customColor: Color;
    setCustomColor: Dispatch<Color>;
    useCustomColor: boolean;
    setUseCustomColor: Dispatch<boolean>;
}



export const useColorTheme = (): ThemeSettings => {
    const [theme, setTheme] = useLocalStorage<Theme>('state-theme', 'system');
    const [customColor, setCustomColor] = useLocalStorage<CSSProperties['color'] | undefined>('state-custom-color', 'oklch(0.76 0.2 20)');
    const [useCustomColor, setUseCustomColor] = useLocalStorage<boolean>('state-use-custom-color', false);

    const root = window.document.documentElement;

    // Apply the color scheme to the document root
    useEffect(() => {
        switch (theme) {
            case 'light':
                root.style.colorScheme = 'light';
                break;
            case 'dark':
                root.style.colorScheme = 'dark';
                break;
            case 'system':
                root.style.colorScheme = 'dark light';
        };

    }, [theme, root]);

    useEffect(() => {
        if (customColor && useCustomColor) {
            root.style.setProperty('--custom-color', customColor);
        } else {
            root.style.removeProperty('--custom-color');
        }
    }, [customColor, root.style, useCustomColor])

    return {
        colorScheme: theme,
        setColorScheme: setTheme,
        customColor,
        setCustomColor,
        useCustomColor,
        setUseCustomColor
    };
}