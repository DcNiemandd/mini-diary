import { type FC } from 'react';
import { LoginForm } from '../../components/loginForm/loginForm';
import style from './loginLayout.module.scss';

export const LoginLayout: FC = () => {
    return (
        <div className={style['login-container']}>
            <h1>Minimalistic diary</h1>
            <LoginForm />
        </div>
    );
};
