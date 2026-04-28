import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { initI18n } from './i18n';
import { StaleBuildBanner } from './components/StaleBuildBanner';
import { useSettings } from '@bilko/platform-core/settings';
import './styles.css';

// Hydrate settings from IndexedDB before first render so the UI doesn't flicker.
await Promise.all([
  initI18n(),
  useSettings.getState().hydrateFromStorage(),
]);

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <StaleBuildBanner />
    </BrowserRouter>
  </React.StrictMode>,
);
