import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { openAppDialog } from '../components/appDialog/appDialog';
import { useSession } from './useSession';

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
            <li>updated settings responsiveness</li>
            <li>
                fixes
                <ul>
                    <li>disabling logout button when the note is not saved</li>
                    <li>fixed auth when registering</li>
                </ul>
            </li>
        </ul>
    ),
    4: (
        <ul>
            <li>multi-user support - notes and settings are now tied to your account</li>
            <li>user can change username</li>
            <li>redesigned login & register form</li>
            <li>
                changes behind the hood
                <ul>
                    <li>database migration to per-user storage</li>
                    <li>last user theme shown on login screen</li>
                </ul>
            </li>
            <li>
                fixes
                <ul>
                    <li>dynamic popover positioning and sizing</li>
                </ul>
            </li>
        </ul>
    ),
};

export const PATCH_NOTES_VERSION = Object.keys(PATCH_NOTES).length;
const MIN_VERSION = 1;

const openPatchNotesDialog = async (version: number) => {
    const result = await openAppDialog({
        title: `Patch notes v${version}`,
        content: PATCH_NOTES[version],
        buttons: [
            { type: 'prev' as const, label: 'Previous', disabled: version <= MIN_VERSION, className: 'button-primary' },
            {
                type: 'next' as const,
                label: 'Next',
                disabled: version >= PATCH_NOTES_VERSION,
                className: 'button-primary',
            },
            { type: 'cancel' as const, label: 'Cancel' },
        ],
        style: { height: '600px' },
    });
    if (result.closedBy === 'button') return result.button.type;
    return 'cancel' as const;
};

const navigatePatchNotes = async (startVersion: number): Promise<number> => {
    let current = startVersion;
    let maxSeen = startVersion;
    while (true) {
        const action = await openPatchNotesDialog(current);
        if (action === 'prev' && current > MIN_VERSION) {
            current -= 1;
        } else if (action === 'next' && current < PATCH_NOTES_VERSION) {
            current += 1;
        } else {
            return maxSeen;
        }
        if (current > maxSeen) {
            maxSeen = current;
        }
    }
};

export const openLatestPatchNotesDialog = () => navigatePatchNotes(PATCH_NOTES_VERSION);

export const usePatchNotes = () => {
    const session = useSession();

    const showPatchnotes = useEffectEvent(async () => {
        if (session.lastPatchNotesShown >= PATCH_NOTES_VERSION) return;
        const startVersion = session.lastPatchNotesShown + 1;
        console.info(`Showing patchnotes from v${startVersion}, version ${PATCH_NOTES_VERSION}`);
        const maxSeen = await navigatePatchNotes(startVersion);
        await session.markPatchNotesSeen(maxSeen);
    });

    useEffect(() => {
        showPatchnotes();
    }, [session.userId]);
};

