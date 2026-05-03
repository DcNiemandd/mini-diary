import { useContext } from 'react';
import { Popover } from '../../../lib/popover';
import { SettingsContext } from '../../contexts/settingsContext/settingsContext';
import { ColorPicker } from '../colorPicker/colorPicker';
import { openHelpDialog } from '../helpDialog/helpDialog';
import { ThemeSwitcher } from '../themeSwitcher/themeSwitcher';
import styles from './settingsPopover.module.css';

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
                            setColorScheme={(scheme) => settings.setColorScheme(scheme)}
                        />
                    </div>
                    <label className={styles['two-columns']}>
                        <span>Use custom color:</span>
                        <input
                            type="checkbox"
                            checked={settings.useCustomColor}
                            onChange={(e) => settings.setUseCustomColor(e.currentTarget.checked)}
                        />
                    </label>
                    <ColorPicker
                        customColor={settings.customColor}
                        setCustomColor={(color) => settings.setCustomColor(color)}
                        disabled={!settings.useCustomColor}
                    />

                    <br />
                    {/* <button onClick={()=> }>Change password</button> */}
                    <button onClick={() => openHelpDialog()}>Help</button>
                </div>
            </Popover.Content>
        </Popover>
    );
};
