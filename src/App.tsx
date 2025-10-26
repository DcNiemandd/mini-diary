import { AppContextProvider } from './contexts/appContext/appContextProvider';
import { TestLayout } from './layouts/testLayout/testLayout';

function App() {
    return (
        <AppContextProvider>
            <TestLayout />
        </AppContextProvider>
    );
}

export default App;

