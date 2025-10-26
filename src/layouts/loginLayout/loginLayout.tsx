import { useContext, type FC } from 'react';
import { AppContext } from '../../contexts/appContext/appContext';
import style from './loginLayout.module.scss';

export const LoginLayout: FC = () => {
    const { auth } = useContext(AppContext);
    return (
        <div className={style['login-container']}>
            <button onClick={() => auth.tryToLogin('password')}>Login</button>
        </div>
    );
};
