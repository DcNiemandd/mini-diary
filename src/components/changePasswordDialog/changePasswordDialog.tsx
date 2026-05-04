import { useEffect, useRef, type FC, type InputEventHandler, type SubmitEventHandler } from 'react';
import { useDialog } from '../../../lib/dialog/index.ts';
import type { AuthState } from '../../hooks/useAuth.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import styles from './changePasswordDialog.module.css';

const FIELD = {
    oldPassword: 'oldPassword',
    newPassword1: 'newPassword1',
    newPassword2: 'newPassword2',
} as const;

type FieldName = keyof typeof FIELD;

type ChangePasswordFormElements = HTMLFormControlsCollection & Record<FieldName, HTMLInputElement>;

interface ChangePasswordForm extends HTMLFormElement {
    readonly elements: ChangePasswordFormElements;
}

export const ChangePasswordDialog: FC<{ changePassword: AuthState['changePassword'] }> = ({ changePassword }) => {
    const formRef = useRef<HTMLFormElement>(null);
    const { onButtonClick, disableButtons, close } = useDialog<'confirm' | 'cancel'>();

    useEffect(() => {
        onButtonClick('confirm', () => {
            formRef.current?.requestSubmit();
            return true;
        });
    }, [onButtonClick]);

    const setFieldError = (form: ChangePasswordForm, name: FieldName, message: string) => {
        form.elements[name].setCustomValidity(message);
        form.reportValidity();
        disableButtons(true, 'confirm');
    };

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        const form = e.currentTarget as ChangePasswordForm;
        const { oldPassword, newPassword1, newPassword2 } = form.elements;

        if (newPassword1.value !== newPassword2.value) {
            setFieldError(form, FIELD.newPassword2, "New passwords don't match");
            return;
        }
        disableButtons(true);
        const ok = await changePassword(oldPassword.value, newPassword1.value);
        disableButtons(false);
        if (!ok) {
            setFieldError(form, FIELD.oldPassword, 'Check your old password');
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
                    name={FIELD.oldPassword}
                    type="password"
                    minLength={6}
                    required
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    name={FIELD.newPassword1}
                    type="password"
                    minLength={6}
                    required
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    name={FIELD.newPassword2}
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

