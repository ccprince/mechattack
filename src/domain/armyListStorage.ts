import { z } from 'zod';
import { newArmyList, type ArmyList } from './armyList';
import { parseArmyList, serializeArmyList } from './armyListDocument';

/** The part of the Web Storage API the app uses, so Node tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Every key held. Only used to rebuild a lost index (ADR 0007). */
  keys(): string[];
}

/** The index of Saved Army Lists (ADR 0007). */
export const indexKey = 'mechattack.armyLists';
const listKeyPrefix = 'mechattack.armyList.';
/** Where one Saved Army List's document lives. */
export const armyListKey = (id: string) => `${listKeyPrefix}${id}`;
/** Where the only Army List was kept before there were several; migrated on load. */
export const singleSlotKey = 'mechattack.armyList';
/** A single slot: a later unreadable save replaces the one kept here. */
export const backupKey = 'mechattack.armyList.backup';

const indexSchema = z.object({
  /** Bumped with a migration whenever the index's shape changes. */
  version: z.literal(1),
  openId: z.string(),
  lists: z.array(z.object({ id: z.string().min(1), changed: z.iso.datetime() })),
});

type ArmyListIndex = z.infer<typeof indexSchema>;

/** What storage needs from outside: the time and fresh ids, fixed in tests. */
export interface StorageContext {
  /** The time as an ISO 8601 string. */
  now(): string;
  newId(): string;
}

const browserContext: StorageContext = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
};

export interface SavedArmyList {
  /** The Open Army List's id, or undefined if storage couldn't keep it, so its saves fail. */
  id: string | undefined;
  list: ArmyList;
  /** Raw text of an unreadable save, kept until the player discards it. */
  backup: string | undefined;
}

/**
 * Opens the Army List that was open last. The single slot migrates in first, as the one to open, and a
 * missing or unreadable index is rebuilt from the list documents. An unreadable list moves to the
 * backup key and out of the index, and the most recently changed remaining one opens instead, or a new
 * one if none is left. Storage errors never throw.
 */
export function openSavedArmyList(
  store: KeyValueStore,
  context: StorageContext = browserContext,
): SavedArmyList {
  let backup: string | undefined;
  try {
    backup = store.getItem(backupKey) ?? undefined;
    const index = readIndex(store, context);

    // Checked even with an index in place: a tab still open on the version before this one keeps saving
    // to the single slot, and its edits arrive as one more list.
    const single = store.getItem(singleSlotKey);
    const singleList = single === null ? undefined : parseArmyList(single);
    if (singleList) return addAndOpen(store, index, singleList, context, backup, singleSlotKey);
    if (single !== null) {
      backup = single;
      moveToBackup(store, singleSlotKey, single);
    }

    for (const entry of byMostRecent(index)) {
      const raw = store.getItem(armyListKey(entry.id));
      const list = raw === null ? undefined : parseArmyList(raw);
      if (list) {
        try {
          // A migrated document is written back, so its first autosave isn't taken for an edit.
          const serialized = serializeArmyList(list);
          if (serialized !== raw) store.setItem(armyListKey(entry.id), serialized);
          writeIndex(store, { ...index, openId: entry.id });
        } catch {
          // Opened all the same: the list is intact, and autosave reports storage refusing it.
        }
        return { id: entry.id, list, backup };
      }
      if (raw !== null) {
        backup = raw;
        moveToBackup(store, armyListKey(entry.id), raw);
      }
      index.lists = index.lists.filter(({ id }) => id !== entry.id);
    }

    return addAndOpen(store, index, newArmyList(), context, backup);
  } catch {
    return { id: undefined, list: newArmyList(), backup };
  }
}

/**
 * Autosaves the Army List with this id, marking when it changed. Writes nothing if the document is
 * unchanged, or if the id has left the index, as a list deleted in another tab has. False if storage
 * refused it.
 */
export function saveArmyList(
  store: KeyValueStore,
  id: string | undefined,
  list: ArmyList,
  context: StorageContext = browserContext,
): boolean {
  if (id === undefined) return false;
  try {
    const serialized = serializeArmyList(list);
    if (store.getItem(armyListKey(id)) === serialized) return true;
    // Read afresh, not remembered: another tab may have changed the index since this one opened.
    const index = readIndex(store, context);
    if (!index.lists.some((entry) => entry.id === id)) return true;

    store.setItem(armyListKey(id), serialized);
    const changed = context.now();
    writeIndex(store, {
      ...index,
      lists: index.lists.map((entry) => (entry.id === id ? { id, changed } : entry)),
    });
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

/**
 * The index, or if it's missing or unreadable, one naming every list document in storage. When those
 * lists really changed was lost with the index, so they are all marked changed now.
 */
function readIndex(store: KeyValueStore, context: StorageContext): ArmyListIndex {
  const raw = store.getItem(indexKey);
  const index = raw === null ? undefined : parseIndex(raw);
  if (index) return index;
  const changed = context.now();
  const lists = store
    .keys()
    .filter((key) => key.startsWith(listKeyPrefix) && key !== backupKey)
    .map((key) => ({ id: key.slice(listKeyPrefix.length), changed }));
  return { version: 1, openId: lists[0]?.id ?? '', lists };
}

function parseIndex(raw: string): ArmyListIndex | undefined {
  try {
    const result = indexSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Stores `list` under a new id as the Open Army List, then removes `movedFrom` if it came from there.
 * If storage refuses, the list still opens, without an id.
 */
function addAndOpen(
  store: KeyValueStore,
  index: ArmyListIndex,
  list: ArmyList,
  context: StorageContext,
  backup: string | undefined,
  movedFrom?: string,
): SavedArmyList {
  const id = context.newId();
  try {
    store.setItem(armyListKey(id), serializeArmyList(list));
    writeIndex(store, {
      ...index,
      openId: id,
      lists: [...index.lists, { id, changed: context.now() }],
    });
  } catch {
    // Left where it came from, for the next load to try again.
    return { id: undefined, list, backup };
  }
  try {
    if (movedFrom !== undefined) store.removeItem(movedFrom);
  } catch {
    // Migrated again on the next load, as one more list: a copy, never a loss.
  }
  return { id, list, backup };
}

function moveToBackup(store: KeyValueStore, key: string, raw: string) {
  try {
    store.setItem(backupKey, raw);
    store.removeItem(key);
  } catch {
    // Still offered for download this visit, just not kept for the next.
  }
}

/** The index's open list first, then the rest, most recently changed first. */
function byMostRecent(index: ArmyListIndex): ArmyListIndex['lists'] {
  const recent = [...index.lists].sort((a, b) => b.changed.localeCompare(a.changed));
  const open = recent.find(({ id }) => id === index.openId);
  return open ? [open, ...recent.filter((entry) => entry !== open)] : recent;
}

function writeIndex(store: KeyValueStore, index: ArmyListIndex) {
  store.setItem(indexKey, JSON.stringify(index));
}
