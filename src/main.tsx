import { Settings } from 'luxon';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/globals.scss';
import './styles/reset.css';
import './styles/theme.scss';

Settings.defaultLocale = navigator.language || 'cs-CZ';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);

