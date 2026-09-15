import { describe, expect, it } from 'vitest';
import type { ArmyList } from './armyList';
import {
  backupKey,
  discardBackup,
  loadArmyList,
  saveArmyList,
  savedArmyListKey,
  type KeyValueStore,
} from './armyListStorage';

function fakeStore(entries: Record<string, string> = {}): KeyValueStore & {
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

const ironLegion: ArmyList = {
  version: 1,
  name: 'Iron Legion',
  bpLimit: 40,
  unitProfiles: [
    {
      kind: 'Mech',
      id: 'u1',
      name: 'Ironclad',
      class: 'Heavy',
      bp: 12,
      mv: 4,
      tp: 2,
      hc: 3,
      armor: 110,
      notes: 'Holds the line',
      hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
      quantity: 2,
    },
  ],
};

describe('saveArmyList and loadArmyList', () => {
  it('round-trips a saved Army List', () => {
    const store = fakeStore();
    saveArmyList(store, ironLegion);
    expect(loadArmyList(store)).toEqual({ list: ironLegion, backup: undefined });
  });

  it('starts fresh when nothing is saved', () => {
    expect(loadArmyList(fakeStore())).toEqual({ list: undefined, backup: undefined });
  });

  it.each([
    ['bad JSON', '{"version": 1, "name": '],
    ['a document failing the schema', JSON.stringify({ ...ironLegion, bpLimit: -5 })],
  ])('moves %s to the backup key and starts fresh', (_, raw) => {
    const store = fakeStore({ [savedArmyListKey]: raw });
    expect(loadArmyList(store)).toEqual({ list: undefined, backup: raw });
    expect(store.entries).toEqual({ [backupKey]: raw });
  });

  it('replaces the backup when a later save is unreadable too', () => {
    const store = fakeStore({ [savedArmyListKey]: 'first', [backupKey]: 'older' });
    loadArmyList(store);
    store.entries[savedArmyListKey] = 'second';
    expect(loadArmyList(store)).toEqual({ list: undefined, backup: 'second' });
    expect(store.entries).toEqual({ [backupKey]: 'second' });
  });

  it('keeps reporting the backup until it is discarded', () => {
    const store = fakeStore({ [savedArmyListKey]: JSON.stringify(ironLegion), [backupKey]: 'bad' });
    expect(loadArmyList(store)).toEqual({ list: ironLegion, backup: 'bad' });
    discardBackup(store);
    expect(loadArmyList(store)).toEqual({ list: ironLegion, backup: undefined });
  });
});

describe('when storage fails', () => {
  const disabled = () => {
    throw new DOMException('Storage is disabled', 'SecurityError');
  };
  const unavailable: KeyValueStore = { getItem: disabled, setItem: disabled, removeItem: disabled };

  it('loads a fresh Army List', () => {
    expect(loadArmyList(unavailable)).toEqual({ list: undefined, backup: undefined });
  });

  it('reports a failed save instead of throwing', () => {
    expect(saveArmyList(unavailable, ironLegion)).toBe(false);
    expect(saveArmyList(fakeStore(), ironLegion)).toBe(true);
  });

  it('ignores a failed discard', () => {
    expect(() => discardBackup(unavailable)).not.toThrow();
  });

  it('still offers an unreadable save when the backup cannot be written', () => {
    const store = fakeStore({ [savedArmyListKey]: 'bad' });
    store.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    expect(loadArmyList(store)).toEqual({ list: undefined, backup: 'bad' });
  });
});
