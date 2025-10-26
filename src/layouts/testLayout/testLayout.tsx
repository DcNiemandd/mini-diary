import { useContext, type FC } from 'react';
import { ColorPicker } from '../../components/colorPicker/colorPicker';
import { ThemeSwitcher } from '../../components/themeSwitcher/themeSwitcher';
import { AppContext } from '../../contexts/appContext/appContext';
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
                <button
                    id="settings-popover-button"
                    popoverTarget="settings-popover"
                >
                    Settings
                </button>
                <div
                    popover="auto"
                    id="settings-popover"
                    anchor="settings-popover-button"
                    style={{ top: 'anchor(bottom)', left: 'anchor(left)' }}
                >
                    <ThemeSwitcher
                        colorScheme={settings.colorScheme}
                        setColorScheme={(scheme) => settings.setColorScheme(scheme)}
                    />

                    <ColorPicker
                        customColor={settings.customColor}
                        setCustomColor={(color) => settings.setCustomColor(color)}
                    />
                </div>
            </div>
            <div className={style['content']}>
                Mini diary
                <div className={style['color-samples']}>
                    {colors.map((color) => (
                        <div key={color}>
                            <div
                                style={{
                                    backgroundColor: `var(${color})`,
                                    width: '50px',
                                    height: '50px',
                                    ...(color.includes('border')
                                        ? { outline: color, backgroundColor: 'var(--bg-dark)' }
                                        : {}),
                                }}
                            />
                            {color}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
