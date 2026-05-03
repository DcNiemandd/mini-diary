import type { FC } from 'react';
import { openAppDialog } from '../appDialog/appDialog';

export const RemoveAccountButton: FC<{ onReset: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
    onReset,
    ...props
}) => {
    const handleClick = async () => {
        const result = await openAppDialog({
            title: 'Remove account',
            content: <p>Are you sure you want to remove your account? This action cannot be undone.</p>,
            buttons: [
                {
                    type: 'confirm',
                    label: 'Yes, remove my account',
                    className: 'button-danger',
                },
                {
                    type: 'cancel',
                    label: 'Cancel',
                },
            ],
        });

        if (result.closedBy === 'button' && result.button?.type === 'confirm') {
            onReset();
        }
    };

    return (
        <button
            type="button"
            {...props}
            onClick={handleClick}
        >
            Remove account
        </button>
    );
};
