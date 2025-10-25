import { useEffect, type CSSProperties, type Dispatch } from "react";
import { useLocalStorage } from "./useStorage";

export type ColorScheme = 'light' | 'dark' | 'system';

export interface ColorSettings {
    colorScheme: ColorScheme;
    setColorScheme: Dispatch<ColorScheme>;
    customColor?: CSSProperties['color'];
    setCustomColor: Dispatch<CSSProperties['color'] | undefined>;
}



export const useColorTheme = (): ColorSettings => {
    const [theme, setTheme] = useLocalStorage<ColorScheme>('state-theme', 'system');
    const [customColor, setCustomColor] = useLocalStorage<CSSProperties['color'] | undefined>('state-custom-color', 'oklch(0.76 0.2 20)');

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
        if (customColor) {
            root.style.setProperty('--custom-color', customColor);
        } else {
            root.style.removeProperty('--custom-color');
        }
    }, [customColor, root.style])

    return {
        colorScheme: theme,
        setColorScheme: setTheme,
        customColor,
        setCustomColor,
    };
}