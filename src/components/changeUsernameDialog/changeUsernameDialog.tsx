import { useEffect, useRef, type FC, type InputEventHandler, type SubmitEventHandler } from 'react';
import { useDialog } from '../../../lib/dialog/index.ts';
import type { SessionContextValue } from '../../contexts/sessionContext/sessionContext.ts';
import { usernameExists } from '../../services/usersService.ts';
import styles from '../../styles/dialogForm.module.css';
import { formFactory } from '../../utils/formFactory.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';

const changeUsernameForm = formFactory(['newUsername']);
const { fields: FIELD, setFieldError: setFieldErrorBase, clearErrors } = changeUsernameForm;
type FieldName = typeof changeUsernameForm.types.FieldName;
type ChangeUsernameForm = typeof changeUsernameForm.types.Form;

interface Props {
    currentUsername: string;
    changeUsername: SessionContextValue['changeUsername'];
}

export const ChangeUsernameDialog: FC<Props> = ({ currentUsername, changeUsername }) => {
    const formRef = useRef<HTMLFormElement>(null);
    const { onButtonClick, disableButtons, close } = useDialog<'confirm' | 'cancel'>();

    useEffect(() => {
        onButtonClick('confirm', () => {
            formRef.current?.requestSubmit();
            return true;
        });
    }, [onButtonClick]);

    const setFieldError = (form: ChangeUsernameForm, name: FieldName, message: string) => {
        setFieldErrorBase(form, name, message);
        disableButtons(true, 'confirm');
    };

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        const form = e.currentTarget as ChangeUsernameForm;
        const { newUsername } = form.elements;
        const value = newUsername.value.trim();

        if (value === currentUsername) {
            setFieldError(form, FIELD.newUsername, 'New username matches the current one');
            return;
        }
        if (value.length > 20) {
            setFieldError(form, FIELD.newUsername, 'Username must be at most 20 characters');
            return;
        }
        if (value.length < 3) {
            setFieldError(form, FIELD.newUsername, 'Username must be at least 3 characters');
            return;
        }

        disableButtons(true);
        if (await usernameExists(value)) {
            disableButtons(false);
            setFieldError(form, FIELD.newUsername, 'Username already taken');
            return;
        }

        const ok = await changeUsername(value);
        disableButtons(false);
        if (!ok) {
            setFieldError(form, FIELD.newUsername, 'Could not change username');
            return;
        }
        await openAppDialog({ title: 'Username changed successfully' });
        close();
    };

    const handleInput: InputEventHandler<HTMLFormElement> = (e) => {
        clearErrors(e.currentTarget as ChangeUsernameForm);
        disableButtons(false, 'confirm');
    };

    return (
        <form
            ref={formRef}
            className={styles['content']}
            onSubmit={handleSubmit}
            onInput={handleInput}
        >
            <input
                type="password"
                autoComplete="current-password"
                tabIndex={-1}
                hidden
            />
            <label className={styles['two-columns']}>
                <span>Current username</span>
                <input
                    type="text"
                    value={currentUsername}
                    disabled
                    readOnly
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New username</span>
                <input
                    name={FIELD.newUsername}
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={20}
                />
            </label>
            <button
                type="submit"
                hidden
            />
        </form>
    );
};
