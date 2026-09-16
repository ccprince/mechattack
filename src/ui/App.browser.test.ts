import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { ArmyList } from '../domain/armyList';
import { armyListKey, backupKey, singleSlotKey } from '../domain/armyListStorage';
import { fakeStore, savedStore, unavailableStore } from '../domain/testStores';
import { browserStore } from './browserStore';
import {
  importFile,
  openArmyListText,
  openSavedArmyList,
  savedArmyListNames,
  savedArmyListTexts,
  setUpApp,
  unitProfiles,
} from './testApp';

const load = setUpApp();

const listName = () => page.getByLabelText('Army List name');
const banner = () => page.getByRole('alert').filter({ hasText: "couldn't be read" });

const ironLegion: ArmyList = { version: 2, name: 'Iron Legion', bpLimit: 40, unitProfiles: [] };

describe('autosave', () => {
  beforeEach(() => localStorage.clear());

  it('keeps edits across a reload', async () => {
    load(browserStore);
    await listName().fill('Iron Legion');
    await page.getByRole('button', { name: 'Add Mech' }).click();
    await expect.element(unitProfiles().getByText('New Mech')).toBeInTheDocument();

    load(browserStore);
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.element(unitProfiles().getByText('New Mech')).toBeInTheDocument();
    // The first Unit Profile opens in the editor.
    await expect.element(page.getByLabelText('Name', { exact: true })).toHaveValue('New Mech');
  });

  it('opens a saved Army List', async () => {
    load(savedStore(ironLegion));
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.element(banner()).not.toBeInTheDocument();
  });

  it('opens the Army List saved before there were several, and keeps its edits', async () => {
    localStorage.setItem(singleSlotKey, JSON.stringify(ironLegion));
    load(browserStore);
    await expect.element(listName()).toHaveValue('Iron Legion');
    await listName().fill('Iron Legion II');
    expect(localStorage.getItem(singleSlotKey)).toBeNull();

    load(browserStore);
    await expect.element(listName()).toHaveValue('Iron Legion II');
    await expect.element(banner()).not.toBeInTheDocument();
  });

  it('opens a saved Troop', async () => {
    const withTroop: ArmyList = {
      ...ironLegion,
      unitProfiles: [
        {
          kind: 'Troop',
          id: 't1',
          name: 'Skyborne',
          class: 'Jump Infantry',
          crewServedWeapon: 'Light Missile',
          notes: '',
          quantity: 2,
        },
      ],
    };
    load(savedStore(withTroop));
    await expect.element(unitProfiles().getByText('Skyborne')).toBeInTheDocument();
    await expect.element(unitProfiles().getByText('6 Bp')).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name', { exact: true })).toHaveValue('Skyborne');
  });
});

describe('recovery banner', () => {
  const unreadable = '{"version": 1, "name": ';

  it('starts a fresh Army List when the save is unreadable', async () => {
    load(fakeStore({ [singleSlotKey]: unreadable }));
    await expect.element(banner()).toBeInTheDocument();
    await expect.element(listName()).toHaveValue('New Army List');
  });

  it('stays up across reloads until Discard, which clears the backup', async () => {
    const store = fakeStore({ [singleSlotKey]: unreadable });
    load(store);
    await expect.element(banner()).toBeInTheDocument();

    load(store);
    await expect.element(banner()).toBeInTheDocument();
    await page.getByRole('button', { name: 'Discard' }).click();
    await expect.element(banner()).not.toBeInTheDocument();
    expect(store.entries[backupKey]).toBeUndefined();

    load(store);
    await expect.element(listName()).toBeInTheDocument();
    await expect.element(banner()).not.toBeInTheDocument();
  });

  it('stays up when an Army List is imported', async () => {
    const store = fakeStore({ [singleSlotKey]: unreadable });
    load(store);
    await importFile(JSON.stringify(ironLegion));
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.element(banner()).toBeInTheDocument();
    expect(store.entries[backupKey]).toBe(unreadable);
  });

  it('comes up when a Saved Army List picked turns out unreadable', async () => {
    const store = savedStore(ironLegion, { ...ironLegion, name: 'Steel Hand' });
    store.entries[armyListKey('list-2')] = unreadable;
    load(store);
    await expect.element(banner()).not.toBeInTheDocument();
    await expect.poll(savedArmyListNames).toContain('Unreadable Army List');

    await openSavedArmyList('Unreadable Army List');
    await expect.element(banner()).toBeInTheDocument();
    await expect.element(listName()).toHaveValue('Iron Legion');
    expect(store.entries[backupKey]).toBe(unreadable);
  });

  it('downloads the raw JSON and keeps the backup', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const store = fakeStore({ [singleSlotKey]: unreadable });
    load(store);

    await page.getByRole('button', { name: 'Download it' }).click();
    await expect.element(banner()).not.toBeInTheDocument();

    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('mech-attack-army-list-backup.json');
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe(unreadable);
    expect(store.entries[backupKey]).toBe(unreadable);
  });
});

describe('when storage is unavailable', () => {
  it('still edits the Army List, with a notice that changes will be lost', async () => {
    load(unavailableStore);
    await expect.element(page.getByText(/Couldn't save to this browser/)).toBeInTheDocument();
    await page.getByRole('button', { name: 'Add Mech' }).click();
    await expect.element(unitProfiles().getByText('New Mech')).toBeInTheDocument();
  });

  it("shows the Army List in the menu as open, with no time, since it isn't saved", async () => {
    load(unavailableStore);
    await listName().fill('Iron Legion');
    await expect.poll(savedArmyListTexts).toEqual(['Iron Legion']);
    await expect.poll(openArmyListText).toBe('Iron Legion');
  });
});
