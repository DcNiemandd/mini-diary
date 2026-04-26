import { openAppDialog } from '../appDialog/appDialog.tsx';
import { HelpContent } from './HelpContent.tsx';

export const openHelpDialog = () =>
    openAppDialog({
        title: <h3>About Mini Diary</h3>,
        content: <HelpContent />,
        showClose: true,
    });

