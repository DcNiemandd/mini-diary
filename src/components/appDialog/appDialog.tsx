import type { DialogButton, DialogButtonTypes, DialogOptions, DialogResult } from '../../../lib/dialog/index.ts';
import { openDialog } from '../../../lib/dialog/index.ts';
import style from './appDialog.module.scss';

type AppDialogButtonTypes<O> = O extends { buttons: readonly DialogButton[] } ? DialogButtonTypes<O> : 'cancel';

export const openAppDialog = <const O extends DialogOptions>(
    options: O
): Promise<DialogResult<AppDialogButtonTypes<O>>> => {
    return openDialog({
        ...options,
        className: `${style.dialog} ${options.className ?? ''}`,
        buttons: options.buttons
            ? options.buttons.map((btn) => ({
                  ...btn,
                  className: `${style.button} ${btn.className ?? ''}`,
              }))
            : [{ label: 'Ok', type: 'cancel' as const }],
        title: options.title && <h2>{options.title}</h2>,
        content: <div className={style.content}>{options.content}</div>,
    }) as Promise<DialogResult<AppDialogButtonTypes<O>>>;
};

