import { useContext, type ButtonHTMLAttributes, type FC } from 'react';
import { AuthContext } from '../../contexts/authContext/authContext.ts';
import { openAppDialog } from '../appDialog/appDialog.tsx';
import { ChangePasswordDialog, type ChangePasswordFormFields } from './changePasswordDialog.tsx';

export const ChangePasswordButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
    const { changePassword } = useContext(AuthContext);

    const openChangePasswordDialog = async () => {
        const formValues: ChangePasswordFormFields = {
            newPassword1: '',
            newPassword2: '',
            oldPassword: '',
        };

        const result = await openAppDialog({
            title: 'Change password',
            content: (
                <ChangePasswordDialog
                    onChange={(key, value) => {
                        formValues[key] = value;
                    }}
                />
            ),
            showClose: true,
            buttons: [
                { label: 'Confirm', type: 'confirm', className: 'button-success' },
                { label: 'Cancel', type: 'cancel' },
            ],
        });

        if (result.closedBy === 'button' && result.button?.type === 'confirm') {
            return formValues;
        }

        return null;
    };

    const onClick = async () => {
        let formValues: ChangePasswordFormFields | null | undefined = undefined;

        // User clicked confirm
        while (formValues !== null) {
            formValues = await openChangePasswordDialog();

            if (formValues === null) {
                break; // Dialog canceles
            }

            if (formValues.newPassword1 !== formValues.newPassword2) {
                await openAppDialog({
                    title: 'Error',
                    content: "New passwords doesn't match",
                });
                continue;
            }

            if (formValues.oldPassword.length < 6 || formValues.newPassword1.length < 6) {
                await openAppDialog({
                    title: 'Error',
                    content: 'Password has to be at least 6 characters',
                });
                continue;
            }

            const isSuccess = await changePassword(formValues.oldPassword, formValues.newPassword1);

            if (!isSuccess) {
                await openAppDialog({
                    title: 'Error',
                    content: 'There was problem. Check your old password.',
                });
                formValues = await openChangePasswordDialog();
                continue;
            }

            break;
        }
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
