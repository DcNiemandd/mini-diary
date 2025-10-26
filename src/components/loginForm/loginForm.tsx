import { useContext, type FC } from 'react';
import { AppContext } from '../../contexts/appContext/appContext';
import style from './loginForm.module.scss';

export const LoginForm: FC = () => {
    const { auth } = useContext(AppContext);
    return (
        <form
            className={style['login-form']}
            onSubmit={(e) => {
                e.preventDefault();
                const password = (e.target as HTMLFormElement).password.value;
                auth.tryToLogin(password);
            }}
        >
            <input
                type="password"
                name="password"
                placeholder="Password"
                required
                minLength={6}
            />
            <button type="submit">{auth.isUser ? 'Login' : 'Set Password'}</button>
        </form>
    );
};
