import { useContext, type ButtonHTMLAttributes, type FC } from 'react';
import { AuthContext } from '../../contexts/authContext/authContext.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import { ChangePasswordDialog } from './changePasswordDialog.tsx';

export const ChangePasswordButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
    const { changePassword } = useContext(AuthContext);

    const onClick = () => {
        openAppDialog({
            title: 'Change password',
            content: <ChangePasswordDialog changePassword={changePassword} />,
            showClose: true,
            buttons: [
                { label: 'Confirm', type: 'confirm', className: 'button-success' },
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

