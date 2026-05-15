import { lazy, Suspense } from 'react';
import { SessionContextProvider } from './contexts/sessionContext/sessionContextProvider';
import { TodayNoteContextProvider } from './contexts/todayNoteContext/todayNoteContextProvider';
import { useLogin } from './hooks/useLogin';
import { LoginLayout } from './layouts/loginLayout/loginLayout';

const NotesLayout = lazy(() =>
    import('./layouts/notesLayout/notesLayout').then((module) => ({ default: module.NotesLayout }))
);

const TestLayout = import.meta.env.DEV
    ? lazy(() => import('./layouts/testLayout/testLayout').then((module) => ({ default: module.TestLayout })))
    : null;

export const Router = () => {
    const { isLoggedIn } = useLogin();

    if (TestLayout && window.location.pathname === '/mini-diary/test') {
        return (
            <Suspense fallback={<div className="loader">Loading...</div>}>
                <TestLayout />
            </Suspense>
        );
    }

    return (
        <Suspense fallback={<div className="loader">Loading...</div>}>
            {isLoggedIn ? (
                <SessionContextProvider>
                    <TodayNoteContextProvider>
                        <NotesLayout />
                    </TodayNoteContextProvider>
                </SessionContextProvider>
            ) : (
                <LoginLayout />
            )}
        </Suspense>
    );
};
