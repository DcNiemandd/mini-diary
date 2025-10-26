import type { FC } from 'react';
import type { ThemeSettings } from '../../hooks/useColorTheme';

export const ThemeSwitcher: FC<Pick<ThemeSettings, 'colorScheme' | 'setColorScheme'>> = ({
    colorScheme,
    setColorScheme,
}) => {
    return (
        <select
            onChange={(e) => {
                setColorScheme(e.target.value as ThemeSettings['colorScheme']);
            }}
            value={colorScheme}
        >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
        </select>
    );
};
