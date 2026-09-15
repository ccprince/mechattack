import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, vi } from 'vitest';
import type { KeyValueStore } from '../domain/armyListStorage';
import { mountApp } from './mountApp';

import { page } from 'vitest/browser';

/**
 * Gives each test in the file a fresh container, unmounted afterwards, and restores every mock
 * after each test. Returns `load`, which starts the app from what the store holds, or starts it
 * again, like a page reload.
 */
export function setUpApp(): (store: KeyValueStore) => void {
  let container: HTMLElement;
  let root: Root | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    root?.unmount();
    root = undefined;
    container.remove();
    vi.restoreAllMocks();
  });

  return (store) => {
    root?.unmount();
    root = mountApp(container, store);
  };
}

export const unitProfiles = () => page.getByRole('navigation', { name: 'Unit Profiles' });

/** The text of a field on the card preview, or null while the card is loading or the field is blank. */
export function cardField(field: string): string | null {
  return document.querySelector(`[role="img"] [data-field="${field}"]`)?.textContent ?? null;
}

/** The `data-mark` of each illegal mark on the card preview. */
export function cardMarks(): string[] {
  return Array.from(document.querySelectorAll('[role="img"] [data-mark]'), (mark) =>
    mark.getAttribute('data-mark'),
  ).filter((mark) => mark !== null);
}
