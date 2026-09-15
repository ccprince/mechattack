import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadArmyList } from '../domain/armyListStorage';
import { App } from './App';
import { browserStore } from './browserStore';
import './global.css';

// Loaded once, before rendering: loading can move an unreadable save to the backup key.
const saved = loadArmyList(browserStore);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={browserStore} saved={saved} />
  </StrictMode>,
);
