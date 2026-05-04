import { type FC } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { openAppDialog } from '../appDialog/appDialog';
import { ExportContent } from './exportContent';
import { ImportContent } from './importContent';

export const ExportImportButtons: FC = () => {
    const auth = useAuth();

    const openExportDialog = () =>
        openAppDialog({
            title: 'Export',
            content: <ExportContent auth={auth} />,
            buttons: [],
        });

    const openImportDialog = () =>
        openAppDialog({
            title: 'Import',
            content: <ImportContent auth={auth} />,
            buttons: [],
        });

    return (
        <>
            <button onClick={openExportDialog}>Export</button>
            <button onClick={openImportDialog}>Import</button>
        </>
    );
};
