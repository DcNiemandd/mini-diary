import { useContext, useEffect, type FC } from 'react';
import { HelpButton } from '../../components/helpButton/HelpButton.tsx';
import { openHelpDialog } from '../../components/helpDialog/helpDialog.tsx';
import { LoginForm } from '../../components/loginForm/loginForm';
import { AuthContext } from '../../contexts/authContext/authContext.ts';
import style from './loginLayout.module.scss';

export const LoginLayout: FC = () => {
    const { isUser, isInitializing } = useContext(AuthContext);

    useEffect(() => {
        if (!isUser && !isInitializing) {
            openHelpDialog();
        }
    }, [isUser, isInitializing]);

    return (
        <div className={style['login-container']}>
            <h1>Minimalistic diary</h1>
            <LoginForm />
            <HelpButton />
        </div>
    );
};
