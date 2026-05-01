import { useContext, useEffect, useRef, type FC } from 'react';
import { DailyNote } from '../../components/dailyNote/dailyNote';
import { SettingsPopover } from '../../components/settingsPopover/settingsPopover.tsx';
import { AuthContext } from '../../contexts/authContext/authContext';
import { useDevTools } from '../../hooks/useDevTools';
import { useEntriesQuery } from '../../hooks/useEntriesQuery';
import { useTodayNote } from '../../hooks/useTodayNote';
import style from './notesLayout.module.scss';

export const NotesLayout: FC = () => {
    const { logout } = useContext(AuthContext);
    const {
        entries: pastEntries,
        isPending,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useEntriesQuery();
    const { todayNote, setTodayContent, isSaved } = useTodayNote();

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
                    <SettingsPopover />
                    <div style={{ flexGrow: 1 }} />
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            logout();
                        }}
                        disabled={!isSaved}
                        title={isSaved ? 'Log out' : 'Please wait until your changes are saved'}
                    >
                        Log out
                    </button>
                </div>
                <div className={style['content']}>
                    <div ref={scrollRef}>
                        <div>
                            {isPending && <p>Loading entries…</p>}
                            {isError && <p>Failed to decrypt entries.</p>}
                            <button
                                onClick={() => fetchNextPage()}
                                disabled={!hasNextPage || isFetchingNextPage}
                            >
                                {isFetchingNextPage
                                    ? 'Loading…'
                                    : hasNextPage
                                      ? 'Load older entries'
                                      : 'All entries loaded'}
                            </button>
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
                                note={todayNote.content}
                                date={todayNote.date}
                                onChange={setTodayContent}
                                daysInRow={todayNote.inRow}
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
