import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/fonts.css';
import './ui/tokens.css';
import './ui/animations.css';
import { registerServiceWorker } from './pwa/register-sw';
import { resolveStoredTheme } from './pwa/theme';

resolveStoredTheme().catch((e) => console.warn('theme resolve failed', e));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);

if ('serviceWorker' in navigator) registerServiceWorker();
