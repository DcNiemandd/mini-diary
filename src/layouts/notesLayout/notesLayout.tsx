import { useContext, useRef, type FC } from 'react';
import { ColorPicker } from '../../components/colorPicker/colorPicker';
import { DailyNote } from '../../components/dailyNote/dailyNote';
import { ThemeSwitcher } from '../../components/themeSwitcher/themeSwitcher';
import { AppContext } from '../../contexts/appContext/appContext';
import style from './notesLayout.module.css';

export const NotesLayout: FC = () => {
    const { settings, auth, entries } = useContext(AppContext);

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
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        scrollBottom();
                    }}
                    className={style['scroll-bottom-button']}
                >
                    Bottom
                </button>
                <div style={{ flexGrow: 1 }} />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        if (entries.isSaved) {
                            auth.logout();
                        } else {
                            alert('Please wait until your changes are saved before logging out.');
                        }
                    }}
                >
                    Log out
                </button>
            </div>
            <div className={style['content']}>
                <div ref={scrollRef}>
                    <div>
                        {entries.entries?.map((entry) => (
                            <DailyNote
                                key={entry.date.toISODate()}
                                note={entry.content}
                                date={entry.date}
                            />
                        ))}
                        <DailyNote
                            key="today-entry"
                            note={entries.todaysEntry.content}
                            date={entries.todaysEntry.date}
                            onChange={(newEntry) =>
                                entries.updateTodaysEntry({
                                    content: newEntry,
                                    date: entries.todaysEntry.date,
                                })
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
