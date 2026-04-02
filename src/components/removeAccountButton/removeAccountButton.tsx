import type { FC } from 'react';
import { openDialog } from '../dialog/index.ts';

export const RemoveAccountButton: FC<{ onReset: () => void }> = ({ onReset }) => {
    const handleClick = async () => {
        const result = await openDialog({
            title: 'Remove account',
            content: <p>Are you sure you want to remove your account? This action cannot be undone.</p>,
            buttons: [
                {
                    type: 'confirm',
                    label: 'Yes, remove my account',
                    style: { backgroundColor: 'var(--danger)' },
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
        <button type="button" onClick={handleClick}>
            Remove account
        </button>
    );
};
