import { AppContextProvider } from './contexts/appContext/appContextProvider';
import { Router } from './Router';

function App() {
    return (
        <AppContextProvider>
            <Router />
        </AppContextProvider>
    );
}

export default App;

