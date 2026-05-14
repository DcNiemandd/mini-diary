import { useEffect, useRef, type FC, type InputEventHandler, type SubmitEventHandler } from 'react';
import { useDialog } from '../../../lib/dialog/index.ts';
import type { AuthState } from '../../hooks/useAuth.ts';
import { formFactory } from '../../utils/formFactory.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import styles from './changePasswordDialog.module.css';

const changePasswordForm = formFactory(['oldPassword', 'newPassword1', 'newPassword2']);
const { fields: FIELD, setFieldError: setFieldErrorBase, clearErrors } = changePasswordForm;
type FieldName = typeof changePasswordForm.types.FieldName;
type ChangePasswordForm = typeof changePasswordForm.types.Form;

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
        setFieldErrorBase(form, name, message);
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
        clearErrors(e.currentTarget as ChangePasswordForm);
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

