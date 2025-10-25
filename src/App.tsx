import { AppContextProvider } from './contexts/appContext';
import { TestLayout } from './layouts/testLayout/testLayout';

function App() {
    return (
        <AppContextProvider>
            <TestLayout />
        </AppContextProvider>
    );
}

export default App;

