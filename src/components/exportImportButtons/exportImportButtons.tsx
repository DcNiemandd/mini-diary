import { type FC } from 'react';
import { useDialog } from '../../../lib/dialog';
import { useAuth, type AuthState } from '../../hooks/useAuth';
import { exportRawEntries } from '../../services/exportImportService';
import { openAppDialog } from '../appDialog/appDialog';

const downloadObjectAsJson = async (exportObj: object, exportName: string) => {
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportName + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

const ExportContent: FC<{ auth: AuthState }> = ({ auth }) => {
    const { close } = useDialog();

    return (
        <>
            <h3>Raw export</h3>
            <p>Allows to download the diary in a readable format.</p>
            <button
                onClick={async () => {
                    if (!auth.userId) throw new Error('User is not logged.');
                    downloadObjectAsJson(await exportRawEntries(auth.userId, auth.decryptData), 'diary_export');
                    close();
                }}
            >
                Raw
            </button>
        </>
    );
};

export const ExportImportButtons: FC = () => {
    const auth = useAuth();
    const openExportDialog = () =>
        openAppDialog({
            title: 'Export',
            content: <ExportContent auth={auth} />,
        });

    return (
        <>
            <button onClick={() => openExportDialog()}>Export</button>
            <button onClick={() => {}}>Import</button>
        </>
    );
};
