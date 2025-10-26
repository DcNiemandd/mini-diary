import { lazy, Suspense, useContext } from 'react';
import { AppContext } from './contexts/appContext/appContext';
import { LoginLayout } from './layouts/loginLayout/loginLayout';

const TestLayout = lazy(() =>
    import('./layouts/testLayout/testLayout').then((module) => ({ default: module.TestLayout }))
);

export const Router = () => {
    const { auth } = useContext(AppContext);

    return (
        <Suspense fallback={<div className="loader">Loading...</div>}>
            {auth.isLoggedIn ? <TestLayout /> : <LoginLayout />}
        </Suspense>
    );
};
