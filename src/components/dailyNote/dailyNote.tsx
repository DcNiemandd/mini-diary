import { DateTime } from 'luxon';
import type { Dispatch, FC } from 'react';
import style from './dailyNote.module.scss';

export interface DailyNoteProps {
    note: string;
    date: DateTime;
    daysInRow?: number;
    onChange?: Dispatch<string>;
}

export const DailyNote: FC<DailyNoteProps> = ({ date, note, onChange, daysInRow }) => {
    return (
        <article
            className={style['daily-note']}
            data-days-in-row={daysInRow}
        >
            <header className={style['top-bar']}>
                <time
                    className={style['date-label']}
                    dateTime={date.toISODate() ?? undefined}
                >
                    {date.toLocaleString(DateTime.DATE_FULL)}
                </time>
                <span
                    className={style['days-in-row']}
                    title="Days in a row"
                >
                    ✧ {daysInRow}
                </span>
            </header>
            {onChange ? (
                <div
                    className="note-grow"
                    data-replicated-value={note}
                >
                    <textarea
                        className="note-content"
                        value={note}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>
            ) : (
                <p className={style['note-content']}>{note}</p>
            )}
        </article>
    );
};
