import type { FC, MouseEventHandler } from 'react';
import { useDialog } from '../../../lib/dialog';
import type { AuthState } from '../../hooks/useAuth';
import { exportEncryptedEntries, exportRawEntries } from '../../services/exportImportService';
import styles from './exportImportButtons.module.css';

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

export const ExportContent: FC<{ auth: AuthState }> = ({ auth }) => {
    const { close } = useDialog();

    const onClickHandler: MouseEventHandler<HTMLButtonElement> = async (e) => {
        if (!auth.isLoggedIn) throw new Error('User is not logged.');

        if (e.currentTarget.getAttribute('itemType') === 'raw') {
            downloadObjectAsJson(await exportRawEntries(auth.userId!, auth.decryptData), 'diary_raw_entries_export');
        } else {
            downloadObjectAsJson(await exportEncryptedEntries(auth.userId!), 'diary_encrypted_user_export');
        }

        close();
    };

    return (
        <div className={styles['content']}>
            <h3>Entries</h3>
            <p>Diary entries in a readable format.</p>
            <button
                onClick={onClickHandler}
                itemType="raw"
            >
                Export
            </button>
            <hr />
            <h3>User profile</h3>
            <p>Encrypted user database. Ideal for migrating to a different browser.</p>
            <button
                onClick={onClickHandler}
                itemType="encrypted"
            >
                Export
            </button>
        </div>
    );
};
