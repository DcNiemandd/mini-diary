export const queryKeys = {
    entries: (userId: string) => ['entries', userId] as const,
    todaysEntry: (userId: string) => ['entries', userId, 'today'] as const,
} as const;
