import { AuthContextProvider } from './contexts/authContext/authContextProvider';
import { SettingsContextProvider } from './contexts/settingsContext/settingsContextProvider';
import { Router } from './Router';

function App() {
    return (
        <AuthContextProvider>
            <SettingsContextProvider>
                <Router />
            </SettingsContextProvider>
        </AuthContextProvider>
    );
}

export default App;

