import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { page } from 'vitest/browser';
import type { ArmyList } from '../domain/armyList';
import { savedStore, unavailableStore } from '../domain/testStores';
import {
  chooseFromMenu,
  importFile,
  openButton,
  openSavedArmyList,
  setUpApp,
  unitProfiles,
} from './testApp';

const load = setUpApp();

const mech = (id: string, name: string) => ({
  kind: 'Mech' as const,
  id,
  name,
  class: 'Light' as const,
  armor: 30,
  heatSinks: 0,
  engineUpgrades: 0,
  notes: '',
  hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
  quantity: 1,
});
const ironLegion: ArmyList = {
  version: 2,
  name: 'Iron Legion',
  bpLimit: 40,
  unitProfiles: [mech('a', 'Ironclad'), mech('b', 'Bulwark')],
};
const steelHand: ArmyList = { version: 2, name: 'Steel Hand', bpLimit: 60, unitProfiles: [] };

const listName = () => page.getByLabelText('Army List name');
const bpLimit = () => page.getByLabelText('Bp Limit', { exact: true });

let persisted: Mock<() => Promise<boolean>>;
let persist: Mock<() => Promise<boolean>>;

/** Stands in for `navigator.storage`; restored after each test with every other mock. */
function stubStorage(storage: Partial<StorageManager> | undefined) {
  vi.spyOn(navigator, 'storage', 'get').mockReturnValue(storage as StorageManager);
}

beforeEach(() => {
  persisted = vi.fn(async () => false);
  persist = vi.fn(async () => false);
  stubStorage({ persisted, persist });
});

describe('asking the browser to keep Saved Army Lists', () => {
  it('asks on the first edit in a load, and only then', async () => {
    const store = savedStore(ironLegion, steelHand);
    load(store);
    await expect.element(listName()).toHaveValue('Iron Legion');

    await bpLimit().fill('45');
    await expect.poll(() => persist).toHaveBeenCalledTimes(1);
    await listName().fill('Iron Legion II');
    await chooseFromMenu('New Army List');
    await expect.element(listName()).toHaveValue('New Army List');
    expect(persist).toHaveBeenCalledTimes(1);

    // A reload is a new load, so it asks again: a later ask can succeed where an earlier one didn't.
    load(store);
    await expect.element(bpLimit()).toBeInTheDocument();
    await bpLimit().fill('55');
    await expect.poll(() => persist).toHaveBeenCalledTimes(2);
  });

  it("doesn't ask on loading, switching lists or selecting a Unit Profile", async () => {
    load(savedStore(ironLegion, steelHand));
    await expect.element(unitProfiles().getByText('Bulwark')).toBeInTheDocument();

    await openButton('Bulwark').click();
    await openSavedArmyList('Steel Hand');
    await expect.element(listName()).toHaveValue('Steel Hand');
    await openSavedArmyList('Iron Legion');
    await expect.element(listName()).toHaveValue('Iron Legion');

    expect(persisted).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  const adds = {
    'New Army List': () => chooseFromMenu('New Army List'),
    'Duplicate Army List': () => chooseFromMenu('Duplicate Army List'),
    'Import Army List…': () => importFile(JSON.stringify(steelHand)),
  };

  it.each(Object.keys(adds) as (keyof typeof adds)[])('asks on %s', async (add) => {
    load(savedStore(ironLegion));
    await expect.element(listName()).toHaveValue('Iron Legion');

    await adds[add]();
    await expect.poll(() => persist).toHaveBeenCalledTimes(1);
  });

  it("doesn't ask when the browser has already agreed", async () => {
    persisted.mockResolvedValue(true);
    load(savedStore(ironLegion));
    await expect.element(bpLimit()).toBeInTheDocument();

    await bpLimit().fill('45');
    await expect.poll(() => persisted).toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("doesn't ask when the save failed", async () => {
    load(unavailableStore);
    await expect.element(bpLimit()).toBeInTheDocument();

    // Named, so the unsaved list's entry in the menu isn't also called New Army List.
    await listName().fill('Iron Legion');
    await chooseFromMenu('New Army List');
    await expect.element(page.getByText(/Couldn't save to this browser/)).toBeInTheDocument();
    await expect.element(listName()).toHaveValue('New Army List');
    expect(persisted).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it('waits for the next edit when a save fails after earlier ones worked', async () => {
    const store = savedStore(ironLegion);
    load(store);
    await expect.element(bpLimit()).toBeInTheDocument();
    const setItem = vi.spyOn(store, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError');
    });

    await bpLimit().fill('45');
    await expect.element(page.getByText(/Couldn't save to this browser/)).toBeInTheDocument();
    expect(persisted).not.toHaveBeenCalled();

    setItem.mockRestore();
    await bpLimit().fill('46');
    await expect.poll(() => persist).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['navigator.storage is missing', undefined],
    ['persist is missing', { persisted: async () => false }],
    ['persisted is missing', {}],
  ])('carries on without errors when %s', async (_, storage) => {
    stubStorage(storage);
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent | PromiseRejectionEvent) => errors.push(event);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onError);
    try {
      load(savedStore(ironLegion));
      await expect.element(bpLimit()).toBeInTheDocument();

      await bpLimit().fill('45');
      await listName().fill('Iron Legion II');
      await expect.element(listName()).toHaveValue('Iron Legion II');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
    }
  });
});
