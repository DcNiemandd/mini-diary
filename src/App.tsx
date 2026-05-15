import { LoginContextProvider } from './contexts/loginContext/loginContextProvider';
import { SettingsContextProvider } from './contexts/settingsContext/settingsContextProvider';
import { Router } from './Router';

function App() {
    return (
        <LoginContextProvider>
            <SettingsContextProvider>
                <Router />
            </SettingsContextProvider>
        </LoginContextProvider>
    );
}

export default App;
