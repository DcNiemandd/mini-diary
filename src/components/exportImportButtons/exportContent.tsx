import type { FC, MouseEventHandler } from 'react';
import { useDialog } from '../../../lib/dialog';
import type { SessionContextValue } from '../../contexts/sessionContext/sessionContext';
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

interface ExportContentProps {
    userId: SessionContextValue['userId'];
    decryptData: SessionContextValue['decryptData'];
}

export const ExportContent: FC<ExportContentProps> = ({ userId, decryptData }) => {
    const { close } = useDialog();

    const onClickHandler: MouseEventHandler<HTMLButtonElement> = async (e) => {
        if (e.currentTarget.getAttribute('itemType') === 'raw') {
            downloadObjectAsJson(await exportRawEntries(userId, decryptData), 'diary_raw_entries_export');
        } else {
            downloadObjectAsJson(await exportEncryptedEntries(userId), 'diary_encrypted_user_export');
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
                className="button-primary"
            >
                Export
            </button>
            <hr />
            <h3>User profile</h3>
            <p>Encrypted user database. Ideal for migrating to a different browser.</p>
            <button
                onClick={onClickHandler}
                itemType="encrypted"
                className="button-primary"
            >
                Export
            </button>
        </div>
    );
};
