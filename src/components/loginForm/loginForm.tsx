import { useContext, useRef, useState, type FC } from 'react';
import { AuthContext } from '../../contexts/authContext/authContext';
import { RemoveAccountButton } from '../removeAccountButton/removeAccountButton';
import style from './loginForm.module.scss';

export const LoginForm: FC = () => {
    const auth = useContext(AuthContext);

    const [resetAccountCounter, setResetAccountCounter] = useState(0);
    const formRef = useRef<HTMLFormElement>(null);

    return (
        <form
            ref={formRef}
            className={style['login-form']}
            onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const passwordElement = form.password as HTMLInputElement;
                const password = passwordElement.value;
                const isLoginSuccess = await auth.tryToLogin(password);

                if (!isLoginSuccess) {
                    passwordElement.setCustomValidity('Incorrect password');
                    passwordElement.reportValidity();
                    setResetAccountCounter((c) => c + 1);
                } else {
                    passwordElement.setCustomValidity('');
                    setResetAccountCounter(0);
                }
            }}
        >
            <input
                type="password"
                name="password"
                placeholder="Password"
                required
                minLength={6}
                onInput={(e) => {
                    (e.target as HTMLInputElement).setCustomValidity('');
                }}
            />
            <button type="submit">{auth.isUser ? 'Login' : 'Set Password'}</button>
            {resetAccountCounter >= 3 && (
                <RemoveAccountButton
                    onReset={() => {
                        auth.removeAccount();
                        setResetAccountCounter(0);
                        const pwInput = formRef.current?.password as HTMLFormElement | undefined;
                        if (pwInput) {
                            pwInput.value = '';
                            pwInput.setCustomValidity('');
                            pwInput.focus();
                        }
                    }}
                />
            )}
        </form>
    );
};
