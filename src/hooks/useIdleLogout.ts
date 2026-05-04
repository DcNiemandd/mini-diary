import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useIdle } from './useIdle';

export const useIdleLogout = () => {
    const { logout } = useAuth();
    const queryClient = useQueryClient();

    // 5 mins
    useIdle(5 * 60 * 1000, async () => {
        const waitForMutations = () => {
            if (queryClient.isMutating() === 0) return Promise.resolve();

            return new Promise<void>((resolve) => {
                const unsubscribe = queryClient.getMutationCache().subscribe(() => {
                    if (queryClient.isMutating() === 0) {
                        unsubscribe();
                        resolve();
                    }
                });
            });
        };
        await waitForMutations();

        console.info('Logging out due to inactivity.');
        if (import.meta.env.PROD) {
            logout();
        }
    });
};
