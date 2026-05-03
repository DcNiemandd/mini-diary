import { createContext, useContext } from 'react';
import type { OpenDialogFn } from './types.ts';

export type DialogButtonHandler = () => boolean | void | Promise<boolean | void>;

export interface DialogControl<T extends string = string> {
    onButtonClick: (type: T, handler: DialogButtonHandler) => void;
    disableButtons: (disabled: boolean) => void;
    close: () => void;
    openDialog: OpenDialogFn;
}

export const DialogContext = createContext<DialogControl | null>(null);

export const useDialog = <T extends string = string>(): DialogControl<T> => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialog must be called inside Dialog content');
    return ctx as DialogControl<T>;
};
