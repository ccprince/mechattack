import type { KeyValueStore } from '../domain/armyListStorage';

/**
 * `localStorage`, looked up on every call: even reading the global throws when the browser blocks
 * storage, and `armyListStorage` catches errors per call.
 */
export const browserStore: KeyValueStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
