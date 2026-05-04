import { DateTime } from 'luxon';
import { useContext, useRef, useState, type FC } from 'react';
import { ColorPicker } from '../../components/colorPicker/colorPicker';
import { DailyNote } from '../../components/dailyNote/dailyNote';
import { ThemeSwitcher } from '../../components/themeSwitcher/themeSwitcher';
import { SettingsContext } from '../../contexts/settingsContext/settingsContext';
import { useAuth } from '../../hooks/useAuth';
import style from './testLayout.module.css';

export const TestLayout: FC = () => {
    const { logout } = useAuth();
    const settings = useContext(SettingsContext);
    const [todayContent, setTodayContent] = useState('');

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

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className={style.container}>
            <div className={style['top-bar']}>
                <button
                    id="settings-popover-button"
                    popoverTarget="settings-popover"
                >
                    Settings
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        scrollBottom();
                    }}
                >
                    Bottom
                </button>
                <div style={{ flexGrow: 1 }} />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        logout();
                    }}
                >
                    Log out
                </button>
                <div
                    ref={(el) => {
                        el?.setAttribute('anchor', 'settings-popover-button');
                    }}
                    popover="auto"
                    id="settings-popover"
                    style={{ top: 'anchor(bottom)', left: 'anchor(left)' }}
                >
                    <ThemeSwitcher
                        colorScheme={settings.colorScheme}
                        setColorScheme={(scheme) => settings.setColorScheme(scheme)}
                    />
                    <br />
                    <label>
                        Use custom color
                        <input
                            type="checkbox"
                            checked={settings.useCustomColor}
                            onChange={(e) => settings.setUseCustomColor(e.currentTarget.checked)}
                        />
                    </label>

                    <ColorPicker
                        customColor={settings.customColor}
                        setCustomColor={(color) => settings.setCustomColor(color)}
                        disabled={!settings.useCustomColor}
                    />
                </div>
            </div>
            <div className={style['content']}>
                <div ref={scrollRef}>
                    <div>
                        <div className={style['color-samples']}>
                            {colors.map((color) => (
                                <div key={color}>
                                    <div
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            ...(color.includes('border-card')
                                                ? { border: color, backgroundColor: 'var(--bg-dark)' }
                                                : { background: `var(${color})` }),
                                        }}
                                    />
                                    {color}
                                </div>
                            ))}
                        </div>
                        <div>
                            <DailyNote
                                date={DateTime.now()}
                                note={todayContent}
                                onChange={setTodayContent}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
