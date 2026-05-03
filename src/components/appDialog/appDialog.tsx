import type { DialogOptions, OpenDialogFn } from '../../../lib/dialog/index.ts';
import { openDialog } from '../../../lib/dialog/index.ts';
import style from './appDialog.module.scss';

export const openAppDialog: OpenDialogFn = ((options: DialogOptions) => {
    return openDialog({
        ...options,
        className: `${style.dialog} ${options.className ?? ''}`,
        buttons: options.buttons?.map((btn) => ({
            ...btn,
            className: `${style.button} ${btn.className ?? ''}`,
        })),
        title: options.title && <h2>{options.title}</h2>,
        content: options.content && <div className={style.content}>{options.content}</div>,
    });
}) as OpenDialogFn;

