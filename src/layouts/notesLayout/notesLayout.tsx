import { useContext, useEffect, useEffectEvent, useRef, type FC } from 'react';
import { OldNotes } from '../../components/oldNotes/oldNotes.tsx';
import { SettingsPopover } from '../../components/settingsPopover/settingsPopover.tsx';
import { TodayNote } from '../../components/todayNote/todayNote.tsx';
import { AuthContext } from '../../contexts/authContext/authContext';
import { useDevTools } from '../../hooks/useDevTools';
import { useEntriesQuery } from '../../hooks/useEntriesQuery.ts';
import { useIdleLogout } from '../../hooks/useIdleLogout.ts';
import { useTodayNote } from '../../hooks/useTodayNote.ts';
import style from './notesLayout.module.scss';

export const NotesLayout: FC = () => {
    useDevTools();
    useIdleLogout();
    const { logout } = useContext(AuthContext);

    const { isSaved } = useTodayNote();

    const { fetchNextPage, hasNextPage, isFetchingNextPage } = useEntriesQuery();

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollBottomRef = useRef<HTMLButtonElement>(null);
    const scrollBottom = () => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };

    const loadOnScroll = useEffectEvent(() => {
        const scrollRefCurrent = scrollRef.current;
        if (!scrollRefCurrent) return;

        // Show bottom scroll button
        if (scrollBottomRef.current) {
            const isAtBottom = scrollRefCurrent.scrollTop > -50;
            scrollBottomRef.current.style.display = isAtBottom ? 'none' : 'block';
        }

        // Load new notes
        const { scrollTop, scrollHeight, clientHeight } = scrollRefCurrent;
        const scrollableDistance = scrollHeight - clientHeight;
        if (scrollableDistance > 0 && Math.abs(scrollTop) >= scrollableDistance * 0.8) {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        }
    });

    useEffect(function scrollHandler() {
        const scrollRefCurrent = scrollRef.current;

        scrollRefCurrent?.addEventListener('scroll', loadOnScroll);

        return () => {
            scrollRefCurrent?.removeEventListener('scroll', loadOnScroll);
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
                            <OldNotes />
                            <TodayNote />
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
