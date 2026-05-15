import { useEffect, useRef, type FC } from 'react';
import { useDialog } from '../../../lib/dialog';
import type { SessionContextValue } from '../../contexts/sessionContext/sessionContext';
import { exportSchema, importEntries, isEncryptedExport, type DiaryExport } from '../../services/exportImportService';
import { openAppDialog } from '../appDialog/appDialog';
import styles from './exportImportButtons.module.css';

interface ImportContentProps {
    userId: SessionContextValue['userId'];
    decryptData: SessionContextValue['decryptData'];
    encryptData: SessionContextValue['encryptData'];
    onEncryptedImported: () => void | Promise<void>;
    onRawImported: () => void | Promise<void>;
}

export const ImportContent: FC<ImportContentProps> = ({
    userId,
    decryptData,
    encryptData,
    onEncryptedImported,
    onRawImported,
}) => {
    const { onButtonClick, disableButtons, close } = useDialog<'upload' | 'cancel'>();

    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const busyRef = useRef(false);

    useEffect(() => {
        onButtonClick('upload', () => {
            if (busyRef.current) return true;
            const input = fileInputRef.current;
            if (!input) return true;
            input.value = '';
            input.click();
            return true;
        });
    }, [onButtonClick]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busyRef.current) return;
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        busyRef.current = true;
        disableButtons(true, 'upload');
        try {
            let parsed: DiaryExport;
            try {
                parsed = exportSchema.parse(JSON.parse(await file.text()));
            } catch {
                await openAppDialog({
                    title: 'Import failed',
                    content: <p>File is not a valid diary export.</p>,
                });
                return;
            }

            const encrypted = isEncryptedExport(parsed);

            if (encrypted) {
                const r = await openAppDialog({
                    title: 'Import user profile',
                    content: <p>This will replace your current profile and sign you out. Continue?</p>,
                    buttons: [
                        { type: 'confirm', label: 'Import profile', className: 'button-danger' },
                        { type: 'cancel', label: 'Cancel' },
                    ],
                });
                if (r.closedBy !== 'button' || r.button.type !== 'confirm') return;
            }

            disableButtons(true);
            try {
                await importEntries(parsed, userId, decryptData, encryptData);
            } catch {
                await openAppDialog({
                    title: 'Import failed',
                    content: <p>Could not import entries.</p>,
                });
                return;
            }

            if (encrypted) await onEncryptedImported();
            else await onRawImported();

            await openAppDialog({ title: 'Import successful' });
            close();
        } finally {
            busyRef.current = false;
            disableButtons(false);
        }
    };

    return (
        <div className={styles['content']}>
            <form
                ref={formRef}
                onSubmit={onSubmit}
                hidden
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={() => formRef.current?.requestSubmit()}
                />
            </form>
            <p>Upload entries from a file. Import will depend on the type of the file:</p>
            <ul>
                <li>Entries: will be merged into the current diary</li>
                <li>User profile: this will overwrite the current user profile</li>
            </ul>
        </div>
    );
};
