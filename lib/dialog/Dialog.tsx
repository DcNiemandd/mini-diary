import { useEffect, useRef, useState, type FC } from 'react';
import style from './dialog.module.scss';
import type { DialogButton, DialogOptions, DialogResult, OpenDialogFn } from './types.ts';

interface DialogProps extends DialogOptions {
    onResult: (result: DialogResult) => void;
    openDialog: OpenDialogFn;
}

export const Dialog: FC<DialogProps> = ({
    title,
    content,
    buttons = [],
    className,
    style: customStyle,
    showClose = true,
    onResult,
    openDialog,
}) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [buttonsDisabled, setButtonsDisabled] = useState(false);
    const closedViaApi = useRef(false);

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    const handleClose = () => {
        if (closedViaApi.current) return;
        // Native close without our API = backdrop click or escape
        onResult({ closedBy: 'backdrop' });
    };

    const closeWith = (result: DialogResult) => {
        closedViaApi.current = true;
        dialogRef.current?.close();
        onResult(result);
    };

    const handleCrossClick = () => {
        closeWith({ closedBy: 'cross' });
    };

    const handleButtonClick = async (button: DialogButton) => {
        if (button.onClick) {
            const result = await button.onClick({
                disableButtons: setButtonsDisabled,
                openDialog,
            });
            if (result === false) return; // interrupted
        }
        closeWith({ closedBy: 'button', button });
    };

    return (
        <dialog
            ref={dialogRef}
            className={`${style.dialog} ${className ?? ''}`}
            style={customStyle}
            onClose={handleClose}
            closedby="any"
        >
            {(title || showClose) && (
                <header className={style.header}>
                    {title}
                    {showClose && (
                        <button
                            type="button"
                            className={` ${style.close} dialog-close`}
                            onClick={handleCrossClick}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    )}
                </header>
            )}
            {content}
            {buttons.length > 0 && (
                <div className={style.buttons}>
                    {buttons.map((button, i) => (
                        <button
                            key={i}
                            type="button"
                            className={button.className}
                            style={button.style}
                            disabled={buttonsDisabled || button.disabled}
                            onClick={() => handleButtonClick(button)}
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
            )}
        </dialog>
    );
};

