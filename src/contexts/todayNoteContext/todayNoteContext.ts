import { createContext } from 'react';
import type { TodayNoteState } from '../../hooks/useTodayNote';

export const TodayNoteContext = createContext<TodayNoteState | null>(null);
