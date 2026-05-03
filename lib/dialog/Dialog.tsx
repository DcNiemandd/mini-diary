import { useEffect, useRef, type FC } from 'react';
import style from './dialog.module.scss';
import type { DialogButton, DialogOptions, DialogResult } from './types.ts';

interface DialogProps extends DialogOptions {
    onResult: (result: DialogResult) => void;
}

export const Dialog: FC<DialogProps> = ({
    title,
    content,
    buttons = [],
    className,
    style: customStyle,
    showClose = true,
    onResult,
}) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closedViaApi = useRef(false);

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    const handleClose = () => {
        if (closedViaApi.current) return;
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

    const handleButtonClick = (button: DialogButton) => {
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
                            disabled={button.disabled}
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
