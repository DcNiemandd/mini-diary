import { useState, type FC } from 'react';
import { useDialog } from '../../../lib/dialog/index.ts';
import type { AuthState } from '../../hooks/useAuth.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import styles from './changePasswordDialog.module.css';

export const ChangePasswordDialog: FC<{ changePassword: AuthState['changePassword'] }> = ({ changePassword }) => {
    const { onButtonClick, disableButtons } = useDialog<'confirm' | 'cancel'>();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword1, setNewPassword1] = useState('');
    const [newPassword2, setNewPassword2] = useState('');

    onButtonClick('confirm', async () => {
        if (newPassword1 !== newPassword2) {
            await openAppDialog({ title: 'Error', content: "New passwords don't match" });
            return true;
        }
        if (oldPassword.length < 6 || newPassword1.length < 6) {
            await openAppDialog({ title: 'Error', content: 'Password has to be at least 6 characters' });
            return true;
        }
        disableButtons(true);
        const ok = await changePassword(oldPassword, newPassword1);
        disableButtons(false);
        if (!ok) {
            await openAppDialog({ title: 'Error', content: 'There was problem. Check your old password.' });
            return true;
        }
        return false;
    });

    return (
        <div className={styles['content']}>
            <label className={styles['two-columns']}>
                <span>Old password</span>
                <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.currentTarget.value)}
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    type="password"
                    value={newPassword1}
                    onChange={(e) => setNewPassword1(e.currentTarget.value)}
                />
            </label>
            <label className={styles['two-columns']}>
                <span>New password</span>
                <input
                    type="password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.currentTarget.value)}
                />
            </label>
        </div>
    );
};

