import { useContext, useEffect, type FC } from 'react';
import { LoginForm } from '../../components/loginForm/loginForm';
import { AppContext } from '../../contexts/appContext/appContext';
import style from './loginLayout.module.scss';

export const LoginLayout: FC = () => {
    const { auth } = useContext(AppContext);
    useEffect(() => {
        auth.tryToLogin('tajneHeslo');
    }, []);

    return (
        <div className={style['login-container']}>
            <h1>Minimalistic diary</h1>
            <LoginForm />
        </div>
    );
};
