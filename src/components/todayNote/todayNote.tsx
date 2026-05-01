import type { FC } from 'react';
import { useTodayNote } from '../../hooks/useTodayNote';
import { DailyNote } from '../dailyNote/dailyNote';

export const TodayNote: FC = () => {
    const { todayNote, setTodayContent } = useTodayNote();

    return (
        <DailyNote
            key="today-entry"
            note={todayNote.content}
            date={todayNote.date}
            onChange={setTodayContent}
            daysInRow={todayNote.inRow}
        />
    );
};
