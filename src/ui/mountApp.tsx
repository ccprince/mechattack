import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { KeyValueStore } from '../domain/armyListStorage';
import { loadArmyList } from '../domain/armyListStorage';
import { App } from './App';

/** Starts the app in `container` from what `store` holds, as a page load does. */
export function mountApp(container: Element, store: KeyValueStore): Root {
  // Loaded once, before rendering: loading can move an unreadable save to the backup key.
  const saved = loadArmyList(store);
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App store={store} saved={saved} />
    </StrictMode>,
  );
  return root;
}
