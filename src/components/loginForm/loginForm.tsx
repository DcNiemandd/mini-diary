import { useMutation } from '@tanstack/react-query';
import { useRef, useState, type FC } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { RemoveAccountButton } from '../removeAccountButton/removeAccountButton';
import style from './loginForm.module.scss';

export const LoginForm: FC = () => {
    const auth = useAuth();

    const [resetAccountCounter, setResetAccountCounter] = useState(0);
    const passwordRef = useRef<HTMLInputElement>(null);

    const loginMutation = useMutation({
        mutationFn: async (password: string) => {
            const isLoginSuccess = await auth.tryToLogin(password);

            if (!isLoginSuccess) {
                passwordRef.current?.setCustomValidity('Incorrect password');
                passwordRef.current?.reportValidity();
                setResetAccountCounter((c) => c + 1);
            } else {
                passwordRef.current?.setCustomValidity('');
                setResetAccountCounter(0);
            }
        },
        onError: () => {
            passwordRef.current?.setCustomValidity('Incorrect password');
        },
    });

    return (
        <form
            className={style['login-form']}
            onSubmit={async (e) => {
                e.preventDefault();
                const values = Object.fromEntries(new FormData(e.currentTarget));
                loginMutation.mutate(values.password as string);
            }}
        >
            <input
                ref={passwordRef}
                type="password"
                name="password"
                placeholder="Password"
                required
                minLength={6}
                autoFocus
                onInput={() => {
                    passwordRef.current?.setCustomValidity('');
                }}
            />
            <button type="submit">{auth.isUser ? 'Login' : 'Set Password'}</button>
            <RemoveAccountButton
                style={{ display: resetAccountCounter >= 3 ? undefined : 'none' }}
                onReset={() => {
                    auth.removeAccount();
                    setResetAccountCounter(0);
                    const pwInput = passwordRef.current;
                    if (pwInput) {
                        pwInput.value = '';
                        pwInput.setCustomValidity('');
                        pwInput.focus();
                    }
                }}
            />
        </form>
    );
};
