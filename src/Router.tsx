import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePatchNotes } from './hooks/usePatchNotes';
import { LoginLayout } from './layouts/loginLayout/loginLayout';

const NotesLayout = lazy(() =>
    import('./layouts/notesLayout/notesLayout').then((module) => ({ default: module.NotesLayout }))
);

export const Router = () => {
    usePatchNotes();
    const auth = useAuth();

    useEffect(() => {
        if (import.meta.env.DEV) {
            // auth.tryToLogin('testtest');
        }
    }, []);

    return (
        <Suspense fallback={<div className="loader">Loading...</div>}>
            {auth.isLoggedIn ? <NotesLayout /> : <LoginLayout />}
        </Suspense>
    );
};
