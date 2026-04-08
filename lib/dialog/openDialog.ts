import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Dialog } from './Dialog.tsx';
import type { DialogResult, OpenDialogFn } from './types.ts';

export const openDialog: OpenDialogFn = (options) => {
    return new Promise<DialogResult>((resolve) => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        const cleanup = () => {
            root.unmount();
            container.remove();
        };

        const handleResult = (result: DialogResult) => {
            cleanup();
            resolve(result);
        };

        root.render(
            createElement(Dialog, {
                ...options,
                onResult: handleResult,
                openDialog,
            })
        );
    });
};
