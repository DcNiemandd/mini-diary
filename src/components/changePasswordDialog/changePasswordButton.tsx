import { type ButtonHTMLAttributes, type FC } from 'react';
import { useSession } from '../../hooks/useSession.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import { ChangePasswordDialog } from './changePasswordDialog.tsx';

export const ChangePasswordButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
    const { username, changePassword } = useSession();

    const onClick = () => {
        openAppDialog({
            title: 'Change password',
            content: <ChangePasswordDialog username={username} changePassword={changePassword} />,
            showClose: true,
            buttons: [
                { label: 'Confirm', type: 'confirm', className: 'button-primary' },
                { label: 'Cancel', type: 'cancel' },
            ],
        });
    };

    return (
        <button
            type="button"
            {...props}
            onClick={onClick}
        >
            Change password
        </button>
    );
};

