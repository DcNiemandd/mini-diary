import { openDialog } from '../../../lib/dialog/index.ts';
import type { OpenDialogFn } from '../../../lib/dialog/index.ts';
import style from './appDialog.module.scss';

export const openAppDialog: OpenDialogFn = (options) => {
    return openDialog({
        ...options,
        className: `${style.dialog} ${options.className ?? ''}`,
        buttons: options.buttons?.map((btn) => ({
            ...btn,
            className: `${style.button} ${btn.className ?? ''}`,
        })),
    });
};
