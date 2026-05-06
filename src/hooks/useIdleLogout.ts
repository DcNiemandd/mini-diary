import { useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { SettingsContext } from '../contexts/settingsContext/settingsContext';
import { useAuth } from './useAuth';
import { useIdle } from './useIdle';

export const useIdleLogout = () => {
    const { logout } = useAuth();
    const { idleTimeout } = useContext(SettingsContext);
    const queryClient = useQueryClient();

    if (!idleTimeout) throw new Error('idleTimeout is not set in SettingsContext');

    // {idleTimeout} mins
    useIdle(idleTimeout * 60 * 1000, async () => {
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
