import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/fonts.css';
import './ui/tokens.css';
import './ui/animations.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
