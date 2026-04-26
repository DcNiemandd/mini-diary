import type { FC } from 'react';
import style from './helpDialog.module.scss';

export const HelpContent: FC = () => (
    <div className={style.content}>
        <p>A minimalistic, encrypted diary that lives in your browser.</p>

        <h3>Getting started</h3>
        <ul>
            <li>Set a password to create your account</li>
            <li>Your entries are encrypted and stored locally</li>
            <li>Write in today's note — it saves automatically</li>
        </ul>

        <h3>Features</h3>
        <ul>
            <li>Daily notes with automatic date tracking</li>
            <li>Customizable theme and accent color</li>
            <li>Light and dark mode support</li>
            <li>Works offline as a PWA</li>
        </ul>
    </div>
);
