import { lazy, Suspense, useContext, useEffect } from 'react';
import { AuthContext } from './contexts/authContext/authContext';
import { LoginLayout } from './layouts/loginLayout/loginLayout';

const NotesLayout = lazy(() =>
    import('./layouts/notesLayout/notesLayout').then((module) => ({ default: module.NotesLayout }))
);

export const Router = () => {
    const auth = useContext(AuthContext);

    useEffect(() => {
        auth.tryToLogin('testtest');
    }, []);

    return (
        <Suspense fallback={<div className="loader">Loading...</div>}>
            {auth.isLoggedIn ? <NotesLayout /> : <LoginLayout />}
        </Suspense>
    );
};
