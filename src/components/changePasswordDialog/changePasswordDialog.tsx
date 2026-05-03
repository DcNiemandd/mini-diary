import { useEffect, useLayoutEffect, useRef, useState, type FC } from 'react';
import { useDialog } from '../../../lib/dialog/index.ts';
import type { AuthState } from '../../hooks/useAuth.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import styles from './changePasswordDialog.module.css';

export const ChangePasswordDialog: FC<{ changePassword: AuthState['changePassword'] }> = ({ changePassword }) => {
    const formRef = useRef<HTMLFormElement>(null);
    const { onButtonClick, disableButtons } = useDialog<'confirm' | 'cancel'>();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword1, setNewPassword1] = useState('');
    const [newPassword2, setNewPassword2] = useState('');

    const registerDialog = useLayoutEffect(() => {
        onButtonClick('confirm', async () => {
            formRef.current?.requestSubmit();
            if (!formRef.current?.checkValidity()) {
                return true;
            }

            if (newPassword1 !== newPassword2) {
                await openAppDialog({
                    title: 'Error',
                    content: "New passwords don't match",
                });
                return true;
            }
            disableButtons(true);
            const ok = await changePassword(oldPassword, newPassword1);
            disableButtons(false);
            if (!ok) {
                await openAppDialog({
                    title: 'Error',
                    content: 'There was problem. Check your old password.',
                });
            }

            await openAppDialog({ title: 'Password changed successfully' });

            return false;
        });
    });
    useEffect(() => registerDialog, [registerDialog]);

    return (
        <form
            ref={formRef}
            className={styles['content']}
            onSubmit={(e) => e.preventDefault()}
        >
            <label className={styles['two-columns']}>
                <span>Old password</span>
                <input
                    type="password"
                    minLength={6}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.currentTarget.value)}
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    type="password"
                    minLength={6}
                    value={newPassword1}
                    onChange={(e) => setNewPassword1(e.currentTarget.value)}
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    type="password"
                    minLength={6}
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.currentTarget.value)}
                />
            </label>
        </form>
    );
};

