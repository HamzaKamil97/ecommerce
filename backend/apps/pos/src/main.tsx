import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/tokens.css';
import { registerServiceWorker } from './pwa/register-sw';
import { resolveStoredTheme } from './pwa/theme';

resolveStoredTheme();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);

if ('serviceWorker' in navigator) registerServiceWorker();
