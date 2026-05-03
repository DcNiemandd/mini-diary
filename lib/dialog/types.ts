import type { CSSProperties, ReactNode } from 'react';

export type CloseReason = 'backdrop' | 'cross' | 'button';

export interface DialogButton<T extends string = string> {
    type: T;
    label: ReactNode;
    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
}

export interface DialogOptions<T extends string = string> {
    title?: ReactNode;
    content?: ReactNode;
    buttons?: readonly DialogButton<T>[];
    className?: string;
    style?: CSSProperties;
    showClose?: boolean;
}

export type DialogResult<T extends string = string> =
    | { closedBy: 'backdrop' | 'cross' }
    | { closedBy: 'button'; button: DialogButton<T> };

export type DialogButtonTypes<O> = O extends { buttons: readonly (infer B)[] }
    ? B extends { type: infer T extends string }
        ? T
        : never
    : never;

export type OpenDialogFn = <const O extends DialogOptions>(
    options: O,
) => Promise<DialogResult<DialogButtonTypes<O>>>;
