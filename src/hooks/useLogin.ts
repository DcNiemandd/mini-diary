import { useContext } from 'react';
import { LoginContext, type LoginContextValue } from '../contexts/loginContext/loginContext';

export function useLogin(): LoginContextValue {
    const login = useContext(LoginContext);
    if (!login) throw new Error('useLogin must be used inside LoginContextProvider');
    return login;
}
