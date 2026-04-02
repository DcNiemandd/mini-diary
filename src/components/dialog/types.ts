import type { CSSProperties, ReactNode } from 'react';

export type CloseReason = 'backdrop' | 'cross' | 'button';

export interface DialogButton {
    type: string;
    label: ReactNode;
    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
    onClick?: (ctx: DialogButtonContext) => void | false | Promise<void | false>;
}

export interface DialogButtonContext {
    disableButtons: (disabled: boolean) => void;
    openDialog: OpenDialogFn;
}

export interface DialogOptions {
    title?: ReactNode;
    content?: ReactNode;
    buttons?: DialogButton[];
    className?: string;
    style?: CSSProperties;
    showClose?: boolean;
}

export interface DialogResult {
    closedBy: CloseReason;
    button?: DialogButton;
}

export type OpenDialogFn = (options: DialogOptions) => Promise<DialogResult>;
