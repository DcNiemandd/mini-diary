import { useEffect, type FC } from 'react';
import { HelpButton } from '../../components/helpButton/HelpButton.tsx';
import { openHelpDialog } from '../../components/helpDialog/helpDialog.tsx';
import { LoginForm } from '../../components/loginForm/loginForm';
import { useLogin } from '../../hooks/useLogin.ts';
import style from './loginLayout.module.scss';

export const LoginLayout: FC = () => {
    const { lastUserHint, isInitializing } = useLogin();

    useEffect(() => {
        if (!lastUserHint && !isInitializing) {
            openHelpDialog();
        }
    }, [lastUserHint, isInitializing]);

    return (
        <div className={style['login-container']}>
            <h1>Minimalistic diary</h1>
            <LoginForm />
            <HelpButton />
        </div>
    );
};
