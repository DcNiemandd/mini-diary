import { useEffect, useMemo, type CSSProperties, type Dispatch } from 'react';
import { defaultUserSettings, type ColorScheme, type UserSettings } from '../services/db';
import { useAuth } from './useAuth';

type Theme = ColorScheme;
type Color = CSSProperties['color'] | undefined;
type ThemeFields = Pick<UserSettings, 'colorScheme' | 'customColor' | 'isUseCustomColor'>;

export interface ThemeSettings {
    colorScheme: Theme;
    setColorScheme: Dispatch<Theme>;
    customColor: Color;
    setCustomColor: Dispatch<Color>;
    isUseCustomColor: boolean;
    setIsUseCustomColor: Dispatch<boolean>;
}

const CACHED_THEME_KEY = 'cached-theme-theme';
const CACHED_CUSTOM_COLOR_KEY = 'cached-theme-custom-color';
const CACHED_USE_CUSTOM_COLOR_KEY = 'cached-theme-use-custom-color';

// Theme cached from the last logged user
const readCachedTheme = (): ThemeFields => {
    const fallback = defaultUserSettings();
    const parse = <T>(key: string, validate: (raw: unknown) => raw is T, def: T): T => {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return def;
            const parsed: unknown = JSON.parse(raw);
            return validate(parsed) ? parsed : def;
        } catch {
            return def;
        }
    };
    return {
        colorScheme: parse(
            CACHED_THEME_KEY,
            (v): v is Theme => v === 'light' || v === 'dark' || v === 'system',
            fallback.colorScheme
        ),
        customColor: parse(CACHED_CUSTOM_COLOR_KEY, (v): v is string => typeof v === 'string', fallback.customColor),
        isUseCustomColor: parse(
            CACHED_USE_CUSTOM_COLOR_KEY,
            (v): v is boolean => typeof v === 'boolean',
            fallback.isUseCustomColor
        ),
    };
};

const writeThemeCache = (fields: ThemeFields): void => {
    try {
        localStorage.setItem(CACHED_THEME_KEY, JSON.stringify(fields.colorScheme));
        localStorage.setItem(CACHED_USE_CUSTOM_COLOR_KEY, JSON.stringify(fields.isUseCustomColor));
        if (fields.customColor === undefined) {
            localStorage.removeItem(CACHED_CUSTOM_COLOR_KEY);
        } else {
            localStorage.setItem(CACHED_CUSTOM_COLOR_KEY, JSON.stringify(fields.customColor));
        }
    } catch {
        // Non-fatal; next change retries.
    }
};

const clearThemeCache = (): void => {
    localStorage.removeItem(CACHED_THEME_KEY);
    localStorage.removeItem(CACHED_CUSTOM_COLOR_KEY);
    localStorage.removeItem(CACHED_USE_CUSTOM_COLOR_KEY);
};

export const useColorTheme = (): ThemeSettings => {
    const auth = useAuth();
    const cached = useMemo(() => readCachedTheme(), []);
    const source: ThemeFields = auth.settings ?? cached;
    const { colorScheme, customColor, isUseCustomColor } = source;

    useEffect(
        function syncThemeCache() {
            if (auth.isInitializing) return;
            if (auth.settings) {
                writeThemeCache(auth.settings);
            } else {
                clearThemeCache();
            }
        },
        [auth.isInitializing, auth.settings]
    );

    const root = window.document.documentElement;

    useEffect(
        function updateThemeOnRoot() {
            switch (colorScheme) {
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
        [colorScheme, root]
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
        colorScheme,
        setColorScheme: (value) => {
            void auth.changeSettings({ colorScheme: value });
        },
        customColor,
        setCustomColor: (value) => {
            void auth.changeSettings({ customColor: value });
        },
        isUseCustomColor,
        setIsUseCustomColor: (value) => {
            void auth.changeSettings({ isUseCustomColor: value });
        },
    };
};

