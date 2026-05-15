import { useContext } from 'react';
import { SessionContext, type SessionContextValue } from '../contexts/sessionContext/sessionContext';

export function useSession(): SessionContextValue {
    const session = useContext(SessionContext);
    if (!session) throw new Error('useSession must be used inside SessionContextProvider (logged-in routes only)');
    return session;
}
