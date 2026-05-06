import { useContext } from 'react';
import { TodayNoteContext } from '../contexts/todayNoteContext/todayNoteContext';
import type { Entry } from '../services/entriesDbService';

export interface TodayNoteState {
    todayNote: Entry;
    setTodayContent: (content: string) => void;
    isSaved: boolean;
}

export const useTodayNote = (): TodayNoteState => {
    const ctx = useContext(TodayNoteContext);
    if (!ctx) throw new Error("useTodayNote has to be used inside it's context");
    return ctx;
};
