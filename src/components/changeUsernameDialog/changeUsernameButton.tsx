import { type ButtonHTMLAttributes, type FC } from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import { ChangeUsernameDialog } from './changeUsernameDialog.tsx';

export const ChangeUsernameButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
    const { username, changeUsername } = useAuth();

    const onClick = async () => {
        if (!username) return;
        await openAppDialog({
            title: 'Change username',
            content: (
                <ChangeUsernameDialog
                    currentUsername={username}
                    changeUsername={changeUsername}
                />
            ),
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
            Change username
        </button>
    );
};

