import { useRef, type FC } from 'react';
import style from './removeAccountButton.module.scss';

export const RemoveAccountButton: FC<{ onReset: () => void }> = ({ onReset }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    dialogRef.current?.showModal();
                }}
            >
                Remove account
            </button>
            <dialog
                ref={dialogRef}
                className={style['remove-account-popover']}
                closedby="any"
            >
                <p>Are you sure you want to remove your account? This action cannot be undone.</p>
                <div className={style.buttons}>
                    <button
                        type="button"
                        onClick={() => {
                            dialogRef.current?.close();
                            onReset();
                        }}
                        className={style.yes}
                    >
                        Yes, remove my account
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            dialogRef.current?.close();
                        }}
                        className="no"
                    >
                        Cancel
                    </button>
                </div>
            </dialog>
        </>
    );
};
