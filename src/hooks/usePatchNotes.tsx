import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { openAppDialog } from '../components/appDialog/appDialog';
import { useLocalStorage } from './useStorage';

const PATCH_NOTES: Record<number, ReactNode> = {
    1: (
        <ul>
            <li>
                changes behind the hood
                <ul>
                    <li>using the correct browser storage</li>
                    <li>updated communication with the storage</li>
                    <li>incremental loading of the notes</li>
                    <li>updated dialog</li>
                </ul>
            </li>
            <li>user can change password</li>
            <li>idle logout</li>
            <li>introduced this (patch notes)</li>
            <li>fixed bugs introduced by the changes mentioned before</li>
        </ul>
    ),
    2: (
        <ul>
            <li>introduced import and export</li>
            <li>changed design of the buttons</li>
            <li>
                fixes
                <ul>
                    <li>day streak computation</li>
                    <li>change password dialog layout</li>
                    <li>fixed typing in middle of the note</li>
                </ul>
            </li>
        </ul>
    ),
    3: (
        <ul>
            <li>custom idle timeout</li>
            <li>changed scroll behaviour in the dialog - header and buttons are still visible</li>
            <li>option to view older patch notes</li>
            <li>
                <b>highlighted</b> an important info in the help dialog
            </li>
        </ul>
    ),
};

const VERSION = Object.keys(PATCH_NOTES).length;
const MIN_VERSION = 1;

const openPatchNotesDialog = async (version: number) => {
    const result = await openAppDialog({
        title: `Patch notes v${version}`,
        content: PATCH_NOTES[version],
        buttons: [
            { type: 'prev' as const, label: 'Previous', disabled: version <= MIN_VERSION, className: 'button-primary' },
            { type: 'next' as const, label: 'Next', disabled: version >= VERSION, className: 'button-primary' },
            { type: 'cancel' as const, label: 'Cancel' },
        ],
        style: { height: '600px' },
    });
    if (result.closedBy === 'button') return result.button.type;
    return 'cancel' as const;
};

const navigatePatchNotes = async (startVersion: number) => {
    let current = startVersion;
    while (true) {
        const action = await openPatchNotesDialog(current);
        if (action === 'prev' && current > MIN_VERSION) current -= 1;
        else if (action === 'next' && current < VERSION) current += 1;
        else return;
    }
};

export const openLatestPatchNotesDialog = () => navigatePatchNotes(VERSION);

export const usePatchNotes = () => {
    const [lastPatchNotesShown, setLastPatchNotesShown] = useLocalStorage('migration-patch-notes-shown', 0);

    const showPatchnotes = useEffectEvent(async () => {
        if (lastPatchNotesShown >= VERSION) return;
        const startVersion = lastPatchNotesShown + 1;
        console.info(`Showing patchnotes from v${startVersion}, version ${VERSION}`);
        await navigatePatchNotes(startVersion);
        setLastPatchNotesShown(VERSION);
    });

    useEffect(() => {
        showPatchnotes();
    }, []);
};
