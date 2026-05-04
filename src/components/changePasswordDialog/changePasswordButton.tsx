import { type ButtonHTMLAttributes, type FC } from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import { ChangePasswordDialog } from './changePasswordDialog.tsx';

export const ChangePasswordButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
    const { changePassword } = useAuth();

    const onClick = () => {
        openAppDialog({
            title: 'Change password',
            content: <ChangePasswordDialog changePassword={changePassword} />,
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

