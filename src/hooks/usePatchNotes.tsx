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
};

const VERSION = Object.keys(PATCH_NOTES).length;

const openPatchNotesDialog = async (version: keyof typeof PATCH_NOTES) =>
    await openAppDialog({
        title: `Patch notes v${version}`,
        content: PATCH_NOTES[version],
    });

export const openLatestPatchNotesDialog = () => openPatchNotesDialog(VERSION);

export const usePatchNotes = () => {
    const [lastPatchNotesShown, setLastPatchNotesShown] = useLocalStorage('migration-patch-notes-shown', 0);

    const showPatchnotes = useEffectEvent(async () => {
        for (let i = lastPatchNotesShown + 1; i <= VERSION; i++) {
            console.info(`Showing patchnotes: ${i}, version ${VERSION}`);
            await openPatchNotesDialog(i);
            setLastPatchNotesShown(i);
        }
    });

    useEffect(() => {
        showPatchnotes();
    }, []);
};
