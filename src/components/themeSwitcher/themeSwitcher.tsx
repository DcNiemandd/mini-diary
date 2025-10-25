import type { FC } from 'react';
import type { ColorSettings } from '../../hooks/useColorTheme';

export const ThemeSwitcher: FC<Pick<ColorSettings, 'colorScheme' | 'setColorScheme'>> = ({
    colorScheme,
    setColorScheme,
}) => {
    return (
        <select
            onChange={(e) => {
                setColorScheme(e.target.value as ColorSettings['colorScheme']);
            }}
            value={colorScheme}
        >
            <option
                value="light"
                selected={colorScheme === 'light'}
            >
                Light
            </option>
            <option
                value="dark"
                selected={colorScheme === 'dark'}
            >
                Dark
            </option>
            <option
                value="system"
                selected={colorScheme === 'system'}
            >
                System
            </option>
        </select>
    );
};
