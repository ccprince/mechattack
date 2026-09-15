import type { KeyValueStore } from './armyListStorage';

/** An in-memory store for tests, with its entries open to inspection. */
export function fakeStore(entries: Record<string, string> = {}): KeyValueStore & {
  entries: Record<string, string>;
} {
  return {
    entries,
    getItem: (key) => entries[key] ?? null,
    setItem: (key, value) => {
      entries[key] = value;
    },
    removeItem: (key) => {
      delete entries[key];
    },
  };
}

const disabled = () => {
  throw new DOMException('Storage is disabled', 'SecurityError');
};

/** A store that throws on every call, as `localStorage` does when the browser blocks it. */
export const unavailableStore: KeyValueStore = {
  getItem: disabled,
  setItem: disabled,
  removeItem: disabled,
};
