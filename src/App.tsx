import { AuthContextProvider } from './contexts/authContext/authContextProvider';
import { LoginContextProvider } from './contexts/loginContext/loginContextProvider';
import { SettingsContextProvider } from './contexts/settingsContext/settingsContextProvider';
import { Router } from './Router';

function App() {
    return (
        <LoginContextProvider>
            <AuthContextProvider>
                <SettingsContextProvider>
                    <Router />
                </SettingsContextProvider>
            </AuthContextProvider>
        </LoginContextProvider>
    );
}

export default App;

