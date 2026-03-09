import { type FC, type PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AuthContext } from './authContext';

export const AuthContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const auth = useAuth();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
