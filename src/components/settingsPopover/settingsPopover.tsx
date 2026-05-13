import { useContext } from 'react';
import { Popover } from '../../../lib/popover';
import { SettingsContext } from '../../contexts/settingsContext/settingsContext';
import { openLatestPatchNotesDialog } from '../../hooks/usePatchNotes';
import { ChangePasswordButton } from '../changePasswordDialog/changePasswordButton';
import { ColorPicker } from '../colorPicker/colorPicker';
import { ExportImportButtons } from '../exportImportButtons/exportImportButtons';
import { openHelpDialog } from '../helpDialog/helpDialog';
import { IdleTimeoutSwitcher } from '../idleTimeoutSwitcher/idleTimeoutSwitcher';
import { ThemeSwitcher } from '../themeSwitcher/themeSwitcher';
import styles from './settingsPopover.module.scss';

export const SettingsPopover = () => {
    const settings = useContext(SettingsContext);

    return (
        <Popover>
            <Popover.Trigger>Settings</Popover.Trigger>
            <Popover.Content>
                <div className={styles.content}>
                    <div className={styles['two-columns']}>
                        <span>Theme:</span>
                        <ThemeSwitcher
                            colorScheme={settings.colorScheme}
                            setColorScheme={settings.setColorScheme}
                        />
                    </div>
                    <label className={styles['two-columns']}>
                        <span>Use custom color:</span>
                        <input
                            type="checkbox"
                            checked={settings.isUseCustomColor}
                            onChange={(e) => settings.setIsUseCustomColor(e.currentTarget.checked)}
                        />
                    </label>
                    <ColorPicker
                        customColor={settings.customColor}
                        setCustomColor={settings.setCustomColor}
                        disabled={!settings.isUseCustomColor}
                    />

                    <br />

                    <div className={styles['two-columns']}>
                        <span>Idle time:</span>
                        <IdleTimeoutSwitcher
                            idleTimeout={settings.idleTimeout}
                            setIdleTimeout={settings.setIdleTimeout}
                        />
                    </div>
                    <ChangePasswordButton />
                    <div className={`${styles['two-columns']} ${styles['same-width']}`}>
                        <ExportImportButtons />
                    </div>
                    <br />
                    <div className={`${styles['two-columns']} ${styles['same-width']}`}>
                        <button onClick={() => openLatestPatchNotesDialog()}>Patch notes</button>
                        <button onClick={() => openHelpDialog()}>Help</button>
                    </div>
                </div>
            </Popover.Content>
        </Popover>
    );
};
