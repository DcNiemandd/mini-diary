import { useQueryClient } from '@tanstack/react-query';
import { type FC } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { queryKeys } from '../../queryKeys';
import { openAppDialog } from '../appDialog/appDialog';
import { ExportContent } from './exportContent';
import { ImportContent } from './importContent';

export const ExportImportButtons: FC = () => {
    const auth = useAuth();
    const queryClient = useQueryClient();

    const openExportDialog = () =>
        openAppDialog({
            title: 'Export',
            content: <ExportContent auth={auth} />,
            buttons: [],
        });

    const openImportDialog = () => {
        alert('Importing currently is disabled due to bug.');
        return;
        openAppDialog({
            title: 'Import',
            content: (
                <ImportContent
                    auth={auth}
                    onEncryptedImported={async () => {
                        auth.logout();
                        await auth.reloadUser();
                    }}
                    onRawImported={() => {
                        if (auth.userId === null) return;
                        queryClient.invalidateQueries({ queryKey: queryKeys.entries(auth.userId) });
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
