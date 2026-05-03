import type { FC } from 'react';
import styles from './changePasswordDialog.module.css';

export interface ChangePasswordFormFields {
    oldPassword: string;
    newPassword1: string;
    newPassword2: string;
}

export const ChangePasswordDialog: FC<{
    onChange: <Key extends keyof ChangePasswordFormFields>(key: Key, form: ChangePasswordFormFields[Key]) => void;
}> = ({ onChange }) => {
    return (
        <div className={styles['content']}>
            <label className={styles['two-columns']}>
                <span>Old password</span>
                <input
                    type="password"
                    defaultValue=""
                    onChange={(e) => onChange('oldPassword', e.currentTarget.value)}
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    type="password"
                    defaultValue=""
                    onChange={(e) => onChange('newPassword1', e.currentTarget.value)}
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    type="password"
                    defaultValue=""
                    onChange={(e) => onChange('newPassword2', e.currentTarget.value)}
                />
            </label>
        </div>
    );
};
