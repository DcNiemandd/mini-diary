export const queryKeys = {
    entries: (userId: number) => ['entries', userId] as const,
    todaysEntry: (userId: number) => ['entries', userId, 'today'] as const,
    todaysSavedEntry: (userId: number, isoDate: string) =>
        [...queryKeys.todaysEntry(userId), isoDate, 'saved'] as const,
    todaysDraftEntry: (userId: number, isoDate: string) =>
        [...queryKeys.todaysEntry(userId), isoDate, 'draft'] as const,
} as const;
