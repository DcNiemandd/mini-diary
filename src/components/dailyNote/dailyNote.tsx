import type { Dispatch, FC } from 'react';
import style from './dailyNote.module.scss';

export interface DailyNoteProps {
    note: string;
    date: Date;
    daysInRow?: number;
    onChange?: Dispatch<string>;
}

export const DailyNote: FC<DailyNoteProps> = ({ date, note, onChange, daysInRow }) => {
    return (
        <div className={`${style['daily-note']} ${!onChange ? style['readonly'] : ''}`}>
            <div className="top-bar">
                <span className="date-label">{date.toDateString()}</span>
                <div className="days-in-row">{daysInRow}</div>
            </div>
            <div
                className="note-grow"
                data-replicated-value={note}
            >
                <textarea
                    className="note-content"
                    value={note}
                    onChange={(e) => onChange?.(e.target.value)}
                />
            </div>
        </div>
    );
};
