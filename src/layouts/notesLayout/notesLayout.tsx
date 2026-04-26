import { useContext, useEffect, useRef, type FC } from 'react';
import { Popover } from '../../../lib/popover/index.ts';
import { ColorPicker } from '../../components/colorPicker/colorPicker';
import { DailyNote } from '../../components/dailyNote/dailyNote';
import { ThemeSwitcher } from '../../components/themeSwitcher/themeSwitcher';
import { AuthContext } from '../../contexts/authContext/authContext';
import { SettingsContext } from '../../contexts/settingsContext/settingsContext';
import { useDevTools } from '../../hooks/useDevTools';
import { useEntriesQuery } from '../../hooks/useEntriesQuery';
import { useSplitEntries } from '../../hooks/useSplitEntries';
import { useTodayNote } from '../../hooks/useTodayNote';
import style from './notesLayout.module.scss';

export const NotesLayout: FC = () => {
    const { logout } = useContext(AuthContext);
    const settings = useContext(SettingsContext);
    const { entries, isPending, isError, saveEntry, isSaving } = useEntriesQuery();
    const { todayEntry, pastEntries, today } = useSplitEntries(entries);
    const { todayContent, setTodayContent, isSaved } = useTodayNote(todayEntry, saveEntry, isSaving);

    useDevTools();
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollBottomRef = useRef<HTMLButtonElement>(null);
    const scrollBottom = () => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };

    useEffect(function scrollButtonShower() {
        const scrollRefCurrent = scrollRef.current;
        const handleScroll = () => {
            if (!scrollRefCurrent || !scrollBottomRef.current) return;
            const isAtBottom = scrollRefCurrent.scrollTop > -50;
            scrollBottomRef.current.style.display = isAtBottom ? 'none' : 'block';
        };

        scrollRefCurrent?.addEventListener('scroll', handleScroll);

        return () => {
            scrollRefCurrent?.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <>
            <div className={style.container}>
                <div className={style['top-bar']}>
                    <Popover>
                        <Popover.Trigger>Settings</Popover.Trigger>
                        <Popover.Content>
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
                        </Popover.Content>
                    </Popover>
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
                                    daysInRow={entry.inRow}
                                />
                            ))}
                            <DailyNote
                                key="today-entry"
                                note={todayContent}
                                date={today}
                                onChange={setTodayContent}
                                daysInRow={todayEntry?.inRow}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <button
                ref={scrollBottomRef}
                onClick={(e) => {
                    e.preventDefault();
                    scrollBottom();
                }}
                className={`${style['scroll-bottom-button']} icon-button`}
                title="Scroll to bottom"
                style={{ display: 'none' }}
            >
                ▼
            </button>
        </>
    );
};
