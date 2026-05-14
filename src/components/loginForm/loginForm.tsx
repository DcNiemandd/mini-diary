import { useMutation } from '@tanstack/react-query';
import { useRef, type FC, type InputEventHandler, type SubmitEventHandler } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getUserByUsername, usernameExists } from '../../services/usersService';
import { formFactory } from '../../utils/formFactory';
import style from './loginForm.module.scss';

const loginForm = formFactory(['username', 'password']);
const { fields: FIELD, setFieldError, clearErrors } = loginForm;
type LoginForm = typeof loginForm.types.Form;

export const LoginForm: FC = () => {
    const auth = useAuth();
    const formRef = useRef<LoginForm>(null);

    const isSentinel = auth.username === '';
    const isReturning = auth.username !== null && auth.username !== '';
    const maskedLastUser =
        isReturning && auth.username
            ? auth.username.length <= 2
                ? auth.username
                : `${auth.username[0]}${'*'.repeat(auth.username.length - 2)}${auth.username[auth.username.length - 1]}`
            : '';
    const usernamePlaceholder = isSentinel ? 'Choose a username' : isReturning ? maskedLastUser : 'Username';

    const loginMutation = useMutation({
        mutationFn: async (form: LoginForm) => {
            const typedUsername = form.elements.username.value.trim();
            const password = form.elements.password.value;

            if (isSentinel) {
                if (!typedUsername) {
                    setFieldError(form, 'username', 'Choose a username');
                    return;
                }
                if (await usernameExists(typedUsername)) {
                    setFieldError(form, 'username', 'Username already taken');
                    return;
                }
                const ok = await auth.tryToLogin('', password);
                if (!ok) {
                    setFieldError(form, 'password', 'Incorrect password');
                    return;
                }
                const renamed = await auth.changeUsername(typedUsername);
                if (!renamed) setFieldError(form, 'username', 'Could not claim username');
                return;
            }

            const resolved = typedUsername || (auth.username ?? '');
            if (!resolved) {
                setFieldError(form, 'username', 'Username required');
                return;
            }

            const target = await getUserByUsername(resolved);
            if (!target) {
                if (!typedUsername) {
                    auth.forgetLastUser();
                    setFieldError(form, 'username', 'Last user no longer exists');
                } else {
                    setFieldError(form, 'username', 'No such account — use + to create');
                }
                return;
            }

            const ok = await auth.tryToLogin(resolved, password);
            if (!ok) {
                setFieldError(form, 'password', 'Incorrect password');
                return;
            }
        },
    });

    const signupMutation = useMutation({
        mutationFn: async (form: LoginForm) => {
            const typedUsername = form.elements.username.value.trim();
            const password = form.elements.password.value;

            if (!typedUsername) {
                setFieldError(form, 'username', 'Username required');
                return;
            }
            if (typedUsername.length < 20) {
                setFieldError(form, 'username', 'Username must be at most 20 characters');
                return;
            }
            if (!password || password.length < 6) {
                setFieldError(form, 'password', 'Password must be at least 6 characters');
                return;
            }
            if (isSentinel) {
                setFieldError(form, 'username', 'Claim your account first');
                return;
            }
            if (await usernameExists(typedUsername)) {
                setFieldError(form, 'username', 'Username already taken');
                return;
            }
            const ok = await auth.signup(typedUsername, password);
            if (!ok) setFieldError(form, 'username', 'Could not create account');
        },
    });

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        loginMutation.mutate(e.currentTarget as LoginForm);
    };

    const handleInput: InputEventHandler<HTMLFormElement> = (e) => {
        clearErrors(e.currentTarget as LoginForm);
    };

    const handleCreate = (): void => {
        if (formRef.current) signupMutation.mutate(formRef.current);
    };

    const isBusy = loginMutation.isPending || signupMutation.isPending;

    return (
        <form
            ref={formRef}
            className={style['login-form']}
            onSubmit={handleSubmit}
            onInput={handleInput}
        >
            <input
                type="text"
                name={FIELD.username}
                placeholder={usernamePlaceholder}
                autoComplete="username"
                maxLength={20}
            />
            <input
                type="password"
                name={FIELD.password}
                placeholder="Password"
                required
                minLength={6}
                autoComplete="current-password"
            />
            <div className={style['button-group']}>
                <button
                    type="submit"
                    disabled={isBusy}
                >
                    {isSentinel ? 'Claim & Login' : 'Login'}
                </button>
                <button
                    type="button"
                    className="icon-button"
                    aria-label="Create new user"
                    onClick={handleCreate}
                    disabled={isBusy}
                    title="Create new user"
                >
                    <span aria-hidden="true">+</span>
                </button>
            </div>
        </form>
    );
};

