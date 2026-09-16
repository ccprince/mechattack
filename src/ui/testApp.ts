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

/** Picks a file in the input behind Import JSON, which the button would open a picker for. */
export async function importFile(text: string, name = 'army.json') {
  const input = await vi.waitFor(() => {
    const element = document.querySelector('input[type="file"]');
    if (!element) throw new Error('The app has not rendered yet.');
    return element;
  });
  await page.elementLocator(input).upload(new File([text], name, { type: 'application/json' }));
}

export const unitProfiles = () => page.getByRole('navigation', { name: 'Unit Profiles' });

/** A Unit Profile's row in the list, by the name it shows. */
export const profileRow = (name: string) =>
  unitProfiles()
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) });

/** The row's first button, which opens the Unit Profile in the editor. */
export const openButton = (name: string) => profileRow(name).getByRole('button').first();

/**
 * What every mark in the list says: one per Unit Profile with Issues or a clashing name, in list
 * order. The row itself only carries the mark; the words are its accessible name.
 */
export const profileFlags = (): (string | null)[] =>
  unitProfiles()
    .getByRole('img')
    .elements()
    .map((mark) => mark.getAttribute('aria-label'));

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
