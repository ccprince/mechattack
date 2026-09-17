import { browserStore } from './browserStore';
import { mountApp } from './mountApp';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import './global.css';

mountApp(document.getElementById('root')!, browserStore);
