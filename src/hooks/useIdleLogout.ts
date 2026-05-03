import { useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext/authContext';
import { useIdle } from './useIdle';

export const useIdleLogout = () => {
    const { logout } = useContext(AuthContext);
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
