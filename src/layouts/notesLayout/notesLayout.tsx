import { useContext, useRef, type FC } from 'react';
import { ColorPicker } from '../../components/colorPicker/colorPicker';
import { DailyNote } from '../../components/dailyNote/dailyNote';
import { ThemeSwitcher } from '../../components/themeSwitcher/themeSwitcher';
import { AuthContext } from '../../contexts/authContext/authContext';
import { SettingsContext } from '../../contexts/settingsContext/settingsContext';
import { useEntriesQuery } from '../../hooks/useEntriesQuery';
import { useSplitEntries } from '../../hooks/useSplitEntries';
import { useDevTools } from '../../hooks/useDevTools';
import { useTodayNote } from '../../hooks/useTodayNote';
import style from './notesLayout.module.css';

export const NotesLayout: FC = () => {
    const { logout } = useContext(AuthContext);
    const settings = useContext(SettingsContext);
    const { entries, isPending, isError, saveEntry, isSaving } = useEntriesQuery();
    const { todayEntry, pastEntries, today } = useSplitEntries(entries);
    const { todayContent, setTodayContent, isSaved } = useTodayNote(todayEntry, saveEntry, isSaving);

    useDevTools();
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollBottom = () => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
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
                        if (isSaved) {
                            logout();
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
                        {isPending && <p>Loading entries…</p>}
                        {isError && <p>Failed to decrypt entries.</p>}
                        {pastEntries.map((entry) => (
                            <DailyNote
                                key={entry.date.toISODate()}
                                note={entry.content}
                                date={entry.date}
                            />
                        ))}
                        <DailyNote
                            key="today-entry"
                            note={todayContent}
                            date={today}
                            onChange={setTodayContent}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
