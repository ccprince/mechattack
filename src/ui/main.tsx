import { browserStore } from './browserStore';
import { mountApp } from './mountApp';
import './global.css';

mountApp(document.getElementById('root')!, browserStore);
