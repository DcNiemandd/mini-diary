import { useContext, type FC } from 'react';
import { ThemeSwitcher } from '../../components/themeSwitcher/themeSwitcher';
import { AppContext } from '../../contexts/appContext';
import style from './testLayout.module.css';

export const TestLayout: FC = () => {
    const { settings } = useContext(AppContext);

    const colors: string[] = [
        '--bg-dark',
        '--bg',
        '--bg-light',
        '--gradient',
        '--gradient-hover',
        '--text',
        '--text-muted',
        '--highlight',
        '--border',
        '--border-muted',
        '--border-card',
        '--primary',
        '--secondary',
        '--danger',
        '--warning',
        '--success',
        '--info',
    ];

    return (
        <div className={style.container}>
            <div className={style['top-bar']}>
                <ThemeSwitcher
                    colorScheme={settings.colorScheme}
                    setColorScheme={(scheme) => settings.setColorScheme(scheme)}
                />

                <label>
                    Color:
                    <input
                        type="color"
                        value={settings.customColor}
                        onChange={(e) => settings.setCustomColor(e.currentTarget.value)}
                    />
                </label>
            </div>
            <div className={style['content']}>
                Mini diary
                <div className={style['color-samples']}>
                    {colors.map((color) => (
                        <div>
                            <div
                                key={color}
                                style={{ backgroundColor: `var(${color})`, width: '50px', height: '50px' }}
                            />
                            {color}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
