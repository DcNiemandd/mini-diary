import type { FC } from 'react';
import { openHelpDialog } from '../helpDialog/helpDialog.tsx';
import style from './helpButton.module.scss';

export const HelpButton: FC = () => {
    return (
        <button className={style.button} onClick={openHelpDialog} aria-label="Help">
            ?
        </button>
    );
};
