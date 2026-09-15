import { armyListSchema, type ArmyList } from './armyList';

/** The part of the Web Storage API the app uses, so Node tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const savedArmyListKey = 'mechattack.armyList';
/** A single slot: a later unreadable save replaces the one kept here. */
export const backupKey = 'mechattack.armyList.backup';

export interface SavedArmyList {
  /** The saved Army List, or undefined to start a fresh one. */
  list: ArmyList | undefined;
  /** Raw text of an unreadable save, kept until the player discards it. */
  backup: string | undefined;
}

/**
 * Reads the saved Army List, checked against `armyListSchema`. An unreadable save moves to the
 * backup key so autosave can't overwrite it. Storage errors never throw: the app starts fresh.
 */
export function loadArmyList(store: KeyValueStore): SavedArmyList {
  let raw: string | null;
  let backup: string | undefined;
  try {
    raw = store.getItem(savedArmyListKey);
    backup = store.getItem(backupKey) ?? undefined;
  } catch {
    return { list: undefined, backup: undefined };
  }
  if (raw === null) return { list: undefined, backup };
  const list = parseArmyList(raw);
  if (list) return { list, backup };
  try {
    store.setItem(backupKey, raw);
    store.removeItem(savedArmyListKey);
  } catch {
    // Still offered for download this visit, just not kept for the next.
  }
  return { list: undefined, backup: raw };
}

/** Saves the Army List as its versioned document; false if storage refused it. */
export function saveArmyList(store: KeyValueStore, list: ArmyList): boolean {
  try {
    store.setItem(savedArmyListKey, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function discardBackup(store: KeyValueStore): void {
  try {
    store.removeItem(backupKey);
  } catch {
    // Storage is unavailable, so there's nothing to clear.
  }
}

function parseArmyList(raw: string): ArmyList | undefined {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const result = armyListSchema.safeParse(json);
  return result.success ? result.data : undefined;
}
