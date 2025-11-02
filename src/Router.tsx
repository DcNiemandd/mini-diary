import { lazy, Suspense, useContext } from 'react';
import { AppContext } from './contexts/appContext/appContext';
import { LoginLayout } from './layouts/loginLayout/loginLayout';

const NotesLayout = lazy(() =>
    import('./layouts/notesLayout/notesLayout').then((module) => ({ default: module.NotesLayout }))
);

export const Router = () => {
    const { auth } = useContext(AppContext);

    return (
        <Suspense fallback={<div className="loader">Loading...</div>}>
            {auth.isLoggedIn ? <NotesLayout /> : <LoginLayout />}
        </Suspense>
    );
};
