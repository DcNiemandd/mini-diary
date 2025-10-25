import style from './container.module.css';
import { AppContextProvider } from './contexts/context';

function App() {
    return (
        <AppContextProvider>
            <div className={style.container}>
                <div className="item">Mini diary</div>
            </div>
        </AppContextProvider>
    );
}

export default App;

