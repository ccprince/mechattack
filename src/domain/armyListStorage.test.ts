import { describe, expect, it } from 'vitest';
import { newArmyList, type ArmyList } from './armyList';
import {
  addSavedArmyList,
  armyListKey,
  backupKey,
  deleteSavedArmyList,
  discardBackup,
  indexKey,
  listSavedArmyLists,
  openSavedArmyList,
  saveArmyList,
  singleSlotKey,
  switchSavedArmyList,
  type StorageContext,
} from './armyListStorage';
import { fakeStore, unavailableStore as unavailable } from './testStores';

const ironLegion: ArmyList = {
  version: 2,
  name: 'Iron Legion',
  bpLimit: 40,
  unitProfiles: [
    {
      kind: 'Mech',
      id: 'u1',
      name: 'Ironclad',
      class: 'Heavy',
      armor: 110,
      heatSinks: 1,
      engineUpgrades: 2,
      notes: 'Holds the line',
      hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
      quantity: 2,
    },
  ],
};
const steelHand: ArmyList = { version: 2, name: 'Steel Hand', bpLimit: 60, unitProfiles: [] };

const jan = (day: number) => `2026-01-${String(day).padStart(2, '0')}T00:00:00.000Z`;

/** Ids new-1, new-2…, and a clock on 10 January until a test moves it. */
function testContext(): StorageContext & { time: string } {
  let ids = 0;
  const context = { time: jan(10), newId: () => `new-${++ids}`, now: () => context.time };
  return context;
}

type Entry = { id: string; changed: string };

function indexOf(store: ReturnType<typeof fakeStore>) {
  return JSON.parse(store.entries[indexKey]!) as { version: 1; openId: string; lists: Entry[] };
}

/** A store with an index naming these lists, and a document for each one given. */
function storeWith(openId: string, lists: [Entry, ArmyList | string | null][]) {
  return fakeStore({
    [indexKey]: JSON.stringify({ version: 1, openId, lists: lists.map(([entry]) => entry) }),
    ...Object.fromEntries(
      lists
        .filter(([, doc]) => doc !== null)
        .map(([{ id }, doc]) => [
          armyListKey(id),
          typeof doc === 'string' ? doc : JSON.stringify(doc),
        ]),
    ),
  });
}

describe('saveArmyList and openSavedArmyList', () => {
  it('round-trips a saved Army List', () => {
    const store = fakeStore();
    const context = testContext();
    const { id } = openSavedArmyList(store, context);
    expect(saveArmyList(store, id, ironLegion, context)).toBe(true);
    expect(openSavedArmyList(store, context)).toEqual({ id, list: ironLegion, backup: undefined });
  });

  it('round-trips a Troop', () => {
    const withTroop: ArmyList = {
      ...ironLegion,
      unitProfiles: [
        ...ironLegion.unitProfiles,
        {
          kind: 'Troop',
          id: 'u2',
          name: 'Skyborne',
          class: 'Jump Infantry',
          crewServedWeapon: 'Light Missile',
          notes: 'Drops in',
          quantity: 3,
        },
      ],
    };
    const store = fakeStore();
    const context = testContext();
    const { id } = openSavedArmyList(store, context);
    saveArmyList(store, id, withTroop, context);
    expect(openSavedArmyList(store, context).list).toEqual(withTroop);
  });

  it('opens a new Army List, saved, when nothing is saved', () => {
    const store = fakeStore();
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'new-1',
      list: newArmyList(),
      backup: undefined,
    });
    expect(indexOf(store)).toEqual({
      version: 1,
      openId: 'new-1',
      lists: [{ id: 'new-1', changed: jan(10) }],
    });
    expect(store.entries[armyListKey('new-1')]).toBe(JSON.stringify(newArmyList()));
  });

  it('reopens the list that was open, not the most recently changed', () => {
    const store = storeWith('b', [
      [{ id: 'a', changed: jan(5) }, ironLegion],
      [{ id: 'b', changed: jan(1) }, steelHand],
    ]);
    expect(openSavedArmyList(store, testContext())).toMatchObject({ id: 'b', list: steelHand });
  });

  it('opens the most recently changed list when the open one is missing from the index', () => {
    const store = storeWith('gone', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(5) }, steelHand],
    ]);
    expect(openSavedArmyList(store, testContext())).toMatchObject({ id: 'b', list: steelHand });
    expect(indexOf(store).openId).toBe('b');
  });

  it('marks a list changed only when a save changes it', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(2) }, steelHand],
    ]);
    const context = testContext();
    const { id, list } = openSavedArmyList(store, context);
    const before = { ...store.entries };

    // As autosave does on first render: the list as opened.
    expect(saveArmyList(store, id, list, context)).toBe(true);
    expect(store.entries).toEqual(before);

    saveArmyList(store, id, { ...list, bpLimit: 45 }, context);
    expect(indexOf(store).lists).toEqual([
      { id: 'a', changed: jan(10) },
      { id: 'b', changed: jan(2) },
    ]);
    expect(JSON.parse(store.entries[armyListKey('a')]!)).toEqual({ ...ironLegion, bpLimit: 45 });
  });

  it('loads a list of Mechs and Vehicles saved before Troops, unchanged', () => {
    // Saved text, fixed here so it can't follow later changes to the ArmyList type.
    const raw =
      '{"version":2,"name":"Iron Legion","bpLimit":40,"unitProfiles":[{"kind":"Mech","id":"u1",' +
      '"name":"Ironclad","class":"Heavy","armor":110,"heatSinks":1,"engineUpgrades":2,' +
      '"notes":"Holds the line","hardpoints":{"leftArm":"Heavy Laser","rightArm":null,' +
      '"leftTorso":null,"rightTorso":null},"quantity":2},{"kind":"Vehicle","id":"u2",' +
      '"name":"Hellhound","class":"Light","armor":20,"engineUpgrades":0,"turret":true,' +
      '"staticMount":false,"cargoBays":1,"notes":"","mounts":{"turret":"Light Laser",' +
      '"staticMount1":null,"staticMount2":null},"quantity":1}]}';
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, raw]]);
    expect(openSavedArmyList(store, testContext()).list).toEqual(JSON.parse(raw));
    expect(store.entries[armyListKey('a')]).toBe(raw);
  });

  it('migrates a list saved before the current version, without marking it changed', () => {
    const version1 = {
      ...ironLegion,
      version: 1,
      unitProfiles: ironLegion.unitProfiles.map((profile) => ({
        ...profile,
        heatSinks: undefined,
        engineUpgrades: undefined,
        bp: 12,
        mv: 4,
        tp: 2,
        hc: 3,
      })),
    };
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, JSON.stringify(version1)]]);
    const context = testContext();
    const { id, list } = openSavedArmyList(store, context);
    const migrated = {
      ...ironLegion,
      unitProfiles: [{ ...ironLegion.unitProfiles[0], heatSinks: 0, engineUpgrades: 0 }],
    };
    expect(list).toEqual(migrated);

    saveArmyList(store, id, list, context);
    expect(indexOf(store).lists).toEqual([{ id: 'a', changed: jan(1) }]);
  });
});

describe('New, Duplicate, switching and Delete', () => {
  it('adds a list as changed now and opens it, leaving the one open before intact', () => {
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, ironLegion]]);
    const context = testContext();
    const copy = { ...ironLegion, name: 'Iron Legion (copy)' };
    expect(addSavedArmyList(store, copy, context)).toEqual({
      id: 'new-1',
      list: copy,
      backup: undefined,
    });
    expect(indexOf(store)).toEqual({
      version: 1,
      openId: 'new-1',
      lists: [
        { id: 'a', changed: jan(1) },
        { id: 'new-1', changed: jan(10) },
      ],
    });
    expect(JSON.parse(store.entries[armyListKey('a')]!)).toEqual(ironLegion);
    expect(openSavedArmyList(store, context).list).toEqual(copy);
  });

  it('switches to another list, which then reopens on load, without marking either changed', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(2) }, steelHand],
    ]);
    const context = testContext();
    expect(switchSavedArmyList(store, 'a', context).list).toEqual(ironLegion);
    expect(switchSavedArmyList(store, 'b', context).list).toEqual(steelHand);
    expect(openSavedArmyList(store, context)).toEqual({
      id: 'b',
      list: steelHand,
      backup: undefined,
    });
    expect(indexOf(store).lists).toEqual([
      { id: 'a', changed: jan(1) },
      { id: 'b', changed: jan(2) },
    ]);
  });

  it('switching to an unreadable list backs it up and opens the most recent one left', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(3) }, 'bad'],
      [{ id: 'c', changed: jan(2) }, steelHand],
    ]);
    expect(switchSavedArmyList(store, 'b', testContext())).toEqual({
      id: 'c',
      list: steelHand,
      backup: 'bad',
    });
    expect(indexOf(store).lists.map(({ id }) => id)).toEqual(['a', 'c']);
  });

  it('renames a list by saving it, keeping it in the same place', () => {
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, ironLegion]]);
    const context = testContext();
    saveArmyList(store, 'a', { ...ironLegion, name: 'Iron Legion II' }, context);
    expect(listSavedArmyLists(store, context)).toEqual([
      { id: 'a', name: 'Iron Legion II', changed: jan(10) },
    ]);
  });

  it('deletes a list and opens the most recently changed one left', () => {
    const store = storeWith('b', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(3) }, steelHand],
      [
        { id: 'c', changed: jan(2) },
        { ...ironLegion, name: 'Third' },
      ],
    ]);
    expect(deleteSavedArmyList(store, 'b', testContext()).id).toBe('c');
    expect(store.entries[armyListKey('b')]).toBeUndefined();
    expect(indexOf(store)).toEqual({
      version: 1,
      openId: 'c',
      lists: [
        { id: 'a', changed: jan(1) },
        { id: 'c', changed: jan(2) },
      ],
    });
    expect(JSON.parse(store.entries[armyListKey('a')]!)).toEqual(ironLegion);
  });

  it('opens a new, empty list when the last one is deleted', () => {
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, ironLegion]]);
    expect(deleteSavedArmyList(store, 'a', testContext())).toEqual({
      id: 'new-1',
      list: newArmyList(),
      backup: undefined,
    });
    expect(indexOf(store)).toEqual({
      version: 1,
      openId: 'new-1',
      lists: [{ id: 'new-1', changed: jan(10) }],
    });
  });

  it('lists the Saved Army Lists most recently changed first, unreadable ones without a name', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(3) }, 'bad'],
      [
        { id: 'c', changed: jan(2) },
        { ...ironLegion, name: '' },
      ],
      [{ id: 'gone', changed: jan(4) }, null],
    ]);
    expect(listSavedArmyLists(store, testContext())).toEqual([
      { id: 'b', name: undefined, changed: jan(3) },
      { id: 'c', name: '', changed: jan(2) },
      { id: 'a', name: 'Iron Legion', changed: jan(1) },
    ]);
  });
});

describe('migrating the single slot', () => {
  it('moves a saved Army List to its own key, open, and removes the single slot', () => {
    const store = fakeStore({ [singleSlotKey]: JSON.stringify(ironLegion) });
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'new-1',
      list: ironLegion,
      backup: undefined,
    });
    expect(store.entries).toEqual({
      [indexKey]: JSON.stringify({
        version: 1,
        openId: 'new-1',
        lists: [{ id: 'new-1', changed: jan(10) }],
      }),
      [armyListKey('new-1')]: JSON.stringify(ironLegion),
    });
  });

  it('adds one saved after the index existed, by a tab still on the old version, as another list', () => {
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, steelHand]]);
    store.entries[singleSlotKey] = JSON.stringify(ironLegion);
    expect(openSavedArmyList(store, testContext())).toMatchObject({
      id: 'new-1',
      list: ironLegion,
    });
    expect(indexOf(store).lists.map(({ id }) => id)).toEqual(['a', 'new-1']);
    expect(store.entries[armyListKey('a')]).toBe(JSON.stringify(steelHand));
    expect(store.entries[singleSlotKey]).toBeUndefined();
  });

  it.each([
    ['bad JSON', '{"version": 1, "name": '],
    ['a document failing the schema', JSON.stringify({ ...ironLegion, bpLimit: -5 })],
  ])('moves %s to the backup key and opens a new list', (_, raw) => {
    const store = fakeStore({ [singleSlotKey]: raw });
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'new-1',
      list: newArmyList(),
      backup: raw,
    });
    expect(store.entries[backupKey]).toBe(raw);
    expect(store.entries[singleSlotKey]).toBeUndefined();
  });
});

describe('an unreadable list', () => {
  it('moves to the backup key and leaves the index, and the most recent other list opens', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(9) }, 'not json'],
      [{ id: 'b', changed: jan(1) }, steelHand],
      [{ id: 'c', changed: jan(5) }, ironLegion],
    ]);
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'c',
      list: ironLegion,
      backup: 'not json',
    });
    expect(store.entries[backupKey]).toBe('not json');
    expect(store.entries[armyListKey('a')]).toBeUndefined();
    expect(indexOf(store)).toEqual({
      version: 1,
      openId: 'c',
      lists: [
        { id: 'b', changed: jan(1) },
        { id: 'c', changed: jan(5) },
      ],
    });
  });

  it('opens a new list when it was the only one', () => {
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, 'not json']]);
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'new-1',
      list: newArmyList(),
      backup: 'not json',
    });
    expect(indexOf(store).lists).toEqual([{ id: 'new-1', changed: jan(10) }]);
  });

  it('is dropped from the index silently when its document is missing', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(9) }, null],
      [{ id: 'b', changed: jan(1) }, steelHand],
    ]);
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'b',
      list: steelHand,
      backup: undefined,
    });
    expect(indexOf(store).lists.map(({ id }) => id)).toEqual(['b']);
  });

  it('replaces the backup when a later one is unreadable too', () => {
    const store = fakeStore({ [singleSlotKey]: 'first', [backupKey]: 'older' });
    const context = testContext();
    openSavedArmyList(store, context);
    store.entries[armyListKey('new-1')] = 'second';
    expect(openSavedArmyList(store, context).backup).toBe('second');
    expect(store.entries[backupKey]).toBe('second');
  });

  it('keeps reporting the backup until it is discarded', () => {
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, ironLegion]]);
    store.entries[backupKey] = 'bad';
    expect(openSavedArmyList(store, testContext()).backup).toBe('bad');
    discardBackup(store);
    expect(openSavedArmyList(store, testContext()).backup).toBeUndefined();
  });
});

describe('a missing or unreadable index', () => {
  it.each([
    ['missing', undefined],
    ['unreadable', 'not json'],
    ['failing its schema', JSON.stringify({ version: 1, openId: 'a', lists: 'a' })],
  ])('is rebuilt from the list documents when %s', (_, raw) => {
    const store = fakeStore({
      [armyListKey('a')]: JSON.stringify(ironLegion),
      [armyListKey('b')]: JSON.stringify(steelHand),
      [backupKey]: 'bad',
      unrelated: 'x',
    });
    if (raw !== undefined) store.entries[indexKey] = raw;
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'a',
      list: ironLegion,
      backup: 'bad',
    });
    expect(indexOf(store)).toEqual({
      version: 1,
      openId: 'a',
      lists: [
        { id: 'a', changed: jan(10) },
        { id: 'b', changed: jan(10) },
      ],
    });
  });

  it('is rebuilt when an autosave finds it lost, keeping the list being saved', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(1) }, steelHand],
    ]);
    const context = testContext();
    const { id, list } = openSavedArmyList(store, context);
    store.entries[indexKey] = 'not json';

    expect(saveArmyList(store, id, { ...list, bpLimit: 45 }, context)).toBe(true);
    // When either really changed was lost with the index.
    expect(indexOf(store).lists).toEqual([
      { id: 'a', changed: jan(10) },
      { id: 'b', changed: jan(10) },
    ]);
    expect(JSON.parse(store.entries[armyListKey('a')]!)).toEqual({ ...ironLegion, bpLimit: 45 });
  });
});

describe('another tab', () => {
  it('having deleted the open list, stops its autosaves writing anything', () => {
    const store = storeWith('a', [
      [{ id: 'a', changed: jan(1) }, ironLegion],
      [{ id: 'b', changed: jan(1) }, steelHand],
    ]);
    const context = testContext();
    const { id, list } = openSavedArmyList(store, context);
    // The other tab deletes the list.
    delete store.entries[armyListKey('a')];
    store.entries[indexKey] = JSON.stringify({
      version: 1,
      openId: 'b',
      lists: [{ id: 'b', changed: jan(1) }],
    });
    const before = { ...store.entries };

    expect(saveArmyList(store, id, { ...list, bpLimit: 45 }, context)).toBe(true);
    expect(store.entries).toEqual(before);
  });

  it('having added a list, keeps it when this tab autosaves', () => {
    const store = storeWith('a', [[{ id: 'a', changed: jan(1) }, ironLegion]]);
    const context = testContext();
    const { id, list } = openSavedArmyList(store, context);
    // The other tab adds a list.
    store.entries[armyListKey('b')] = JSON.stringify(steelHand);
    store.entries[indexKey] = JSON.stringify({
      version: 1,
      openId: 'b',
      lists: [
        { id: 'a', changed: jan(1) },
        { id: 'b', changed: jan(3) },
      ],
    });

    saveArmyList(store, id, { ...list, bpLimit: 45 }, context);
    expect(indexOf(store)).toEqual({
      version: 1,
      openId: 'b',
      lists: [
        { id: 'a', changed: jan(10) },
        { id: 'b', changed: jan(3) },
      ],
    });
  });
});

describe('when storage fails', () => {
  it('opens a new Army List whose saves fail', () => {
    const opened = openSavedArmyList(unavailable, testContext());
    expect(opened).toEqual({ id: undefined, list: newArmyList(), backup: undefined });
    expect(saveArmyList(unavailable, opened.id, ironLegion)).toBe(false);
  });

  it('reports a failed save instead of throwing', () => {
    expect(saveArmyList(unavailable, 'a', ironLegion)).toBe(false);
    const store = fakeStore();
    const { id } = openSavedArmyList(store, testContext());
    expect(saveArmyList(store, id, ironLegion)).toBe(true);
  });

  it('ignores a failed discard', () => {
    expect(() => discardBackup(unavailable)).not.toThrow();
  });

  const refusingWrites = (entries: Record<string, string>) => {
    const store = fakeStore(entries);
    store.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    return store;
  };

  it('still offers an unreadable save when the backup cannot be written', () => {
    const store = refusingWrites({ [singleSlotKey]: 'bad' });
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: undefined,
      list: newArmyList(),
      backup: 'bad',
    });
  });

  it('still opens the single slot when it cannot be migrated, leaving it in place', () => {
    const store = refusingWrites({ [singleSlotKey]: JSON.stringify(ironLegion) });
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: undefined,
      list: ironLegion,
      backup: undefined,
    });
    expect(store.entries).toEqual({ [singleSlotKey]: JSON.stringify(ironLegion) });
  });

  it('still opens a saved list when the index cannot be written', () => {
    const store = refusingWrites({});
    Object.assign(
      store.entries,
      storeWith('a', [[{ id: 'a', changed: jan(1) }, ironLegion]]).entries,
    );
    expect(openSavedArmyList(store, testContext())).toEqual({
      id: 'a',
      list: ironLegion,
      backup: undefined,
    });
    expect(saveArmyList(store, 'a', steelHand)).toBe(false);
  });

  it('lists nothing, adds and deletes without throwing, when storage is unavailable', () => {
    expect(listSavedArmyLists(unavailable, testContext())).toEqual([]);
    expect(addSavedArmyList(unavailable, ironLegion, testContext())).toEqual({
      id: undefined,
      list: ironLegion,
      backup: undefined,
    });
    expect(deleteSavedArmyList(unavailable, undefined, testContext())).toEqual({
      id: undefined,
      list: newArmyList(),
      backup: undefined,
    });
  });
});
