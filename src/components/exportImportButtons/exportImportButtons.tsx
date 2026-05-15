import { useQueryClient } from '@tanstack/react-query';
import { type FC } from 'react';
import { useLogin } from '../../hooks/useLogin';
import { useSession } from '../../hooks/useSession';
import { queryKeys } from '../../queryKeys';
import { openAppDialog } from '../appDialog/appDialog';
import { ExportContent } from './exportContent';
import { ImportContent } from './importContent';

export const ExportImportButtons: FC = () => {
    const { userId, decryptData, encryptData } = useSession();
    const { logout } = useLogin();
    const queryClient = useQueryClient();

    const openExportDialog = () =>
        openAppDialog({
            title: 'Export',
            content: (
                <ExportContent
                    userId={userId}
                    decryptData={decryptData}
                />
            ),
            buttons: [],
        });

    const openImportDialog = () => {
        openAppDialog({
            title: 'Import',
            content: (
                <ImportContent
                    userId={userId}
                    decryptData={decryptData}
                    encryptData={encryptData}
                    onEncryptedImported={() => {
                        logout();
                    }}
                    onRawImported={() => {
                        queryClient.invalidateQueries({ queryKey: queryKeys.entries(userId) });
                    }}
                />
            ),
            buttons: [
                { label: 'Upload', type: 'upload', className: 'button-primary' },
                { label: 'Cancel', type: 'cancel' },
            ],
        });
    };

    return (
        <>
            <button onClick={openExportDialog}>Export</button>
            <button onClick={openImportDialog}>Import</button>
        </>
    );
};
