import type { FC } from 'react';
import { openHelpDialog } from '../helpDialog/helpDialog.tsx';
import style from './helpButton.module.scss';

export const HelpButton: FC = () => {
    return (
        <button
            className={`${style.button} icon-button`}
            onClick={openHelpDialog}
            title="Help"
            aria-label="Help"
        >
            ?
        </button>
    );
};

