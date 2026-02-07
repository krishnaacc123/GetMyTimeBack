import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { LogsProvider } from './contexts/LogsContext';
import { TimerProvider } from './contexts/TimerContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <SettingsProvider>
        <LogsProvider>
          <TimerProvider>
            <App />
          </TimerProvider>
        </LogsProvider>
      </SettingsProvider>
    </LanguageProvider>
  </React.StrictMode>
);