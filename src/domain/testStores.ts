import type { ArmyList } from './armyList';
import { armyListKey, indexKey, type KeyValueStore } from './armyListStorage';

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
    keys: () => Object.keys(entries),
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
  keys: disabled,
};

/** A store holding these Army Lists as Saved Army Lists, the first one open, as the app leaves them. */
export function savedStore(...lists: ArmyList[]) {
  const ids = lists.map((_, i) => `list-${i + 1}`);
  return fakeStore({
    [indexKey]: JSON.stringify({
      version: 1,
      openId: ids[0],
      lists: ids.map((id) => ({ id, changed: '2026-01-01T00:00:00.000Z' })),
    }),
    ...Object.fromEntries(lists.map((list, i) => [armyListKey(ids[i]!), JSON.stringify(list)])),
  });
}

/** The saved document of the Army List the index names as open. */
export function openDocument(store: ReturnType<typeof fakeStore>): string | undefined {
  const { openId } = JSON.parse(store.entries[indexKey] ?? '{}') as { openId?: string };
  return openId === undefined ? undefined : store.entries[armyListKey(openId)];
}
