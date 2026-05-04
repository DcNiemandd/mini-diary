import { useEffect, useRef, type FC, type InputEventHandler, type SubmitEventHandler } from 'react';
import { useDialog } from '../../../lib/dialog/index.ts';
import type { AuthState } from '../../hooks/useAuth.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import styles from './changePasswordDialog.module.css';

const getInput = (form: HTMLFormElement, name: string): HTMLInputElement => {
    const el = form.elements.namedItem(name);
    if (!(el instanceof HTMLInputElement)) throw new Error(`Input "${name}" not found`);
    return el;
};

export const ChangePasswordDialog: FC<{ changePassword: AuthState['changePassword'] }> = ({ changePassword }) => {
    const formRef = useRef<HTMLFormElement>(null);
    const { onButtonClick, disableButtons, close } = useDialog<'confirm' | 'cancel'>();

    useEffect(() => {
        onButtonClick('confirm', () => {
            formRef.current?.requestSubmit();
            return true;
        });
    }, [onButtonClick]);

    const setFieldError = (form: HTMLFormElement, name: string, message: string) => {
        getInput(form, name).setCustomValidity(message);
        form.reportValidity();
        disableButtons(true, 'confirm');
    };

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const oldPassword = getInput(form, 'oldPassword').value;
        const newPassword1 = getInput(form, 'newPassword1').value;
        const newPassword2 = getInput(form, 'newPassword2').value;

        if (newPassword1 !== newPassword2) {
            setFieldError(form, 'newPassword2', "New passwords don't match");
            return;
        }
        disableButtons(true);
        const ok = await changePassword(oldPassword, newPassword1);
        disableButtons(false);
        if (!ok) {
            setFieldError(form, 'oldPassword', 'Check your old password');
            return;
        }
        await openAppDialog({ title: 'Password changed successfully' });
        close();
    };

    const handleInput: InputEventHandler<HTMLFormElement> = (e) => {
        const form = e.currentTarget;
        for (const el of form.elements) {
            if (el instanceof HTMLInputElement) el.setCustomValidity('');
        }
        disableButtons(false, 'confirm');
    };

    return (
        <form
            ref={formRef}
            className={styles['content']}
            onSubmit={handleSubmit}
            onInput={handleInput}
        >
            <label className={styles['two-columns']}>
                <span>Old password</span>
                <input
                    name="oldPassword"
                    type="password"
                    minLength={6}
                    required
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    name="newPassword1"
                    type="password"
                    minLength={6}
                    required
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    name="newPassword2"
                    type="password"
                    minLength={6}
                    required
                />
            </label>
            <button
                type="submit"
                hidden
            />
        </form>
    );
};

