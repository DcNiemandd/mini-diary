export const queryKeys = {
    entries: (userId: number) => ['entries', userId] as const,
    todaysEntry: (userId: number) => ['entries', userId, 'today'] as const,
} as const;
