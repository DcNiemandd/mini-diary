import { openAppDialog } from '../appDialog/appDialog.tsx';
import { HelpContent } from './HelpContent.tsx';

export const openHelpDialog = () =>
    openAppDialog({
        title: 'About Mini Diary',
        content: <HelpContent />,
        showClose: true,
    });
