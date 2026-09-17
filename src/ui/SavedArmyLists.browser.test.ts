import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { ArmyList } from '../domain/armyList';
import { armyListKey } from '../domain/armyListStorage';
import { openDocument, savedStore } from '../domain/testStores';
import {
  armyListsButton,
  chooseFromMenu,
  importFile,
  openArmyListsMenu,
  openArmyListText,
  openSavedArmyList,
  savedArmyListNames,
  savedArmyListTexts,
  setUpApp,
  unitProfiles,
} from './testApp';

const load = setUpApp();

const listName = () => page.getByLabelText('Army List name');
const bpLimit = () => page.getByLabelText('Bp Limit', { exact: true });

const mech = (id: string, name: string, armor: number) => ({
  kind: 'Mech' as const,
  id,
  name,
  class: 'Light' as const,
  armor,
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
  unitProfiles: [mech('a', 'Ironclad', 30)],
};
const steelHand: ArmyList = {
  version: 2,
  name: 'Steel Hand',
  bpLimit: 60,
  unitProfiles: [mech('b', 'Fist', 50)],
};

describe('Saved Army Lists', () => {
  it('switches between lists, each keeping its own units, Bp total and Bp Limit', async () => {
    const store = savedStore(ironLegion, steelHand);
    load(store);
    await expect.element(unitProfiles().getByText('Ironclad')).toBeInTheDocument();
    await expect.element(page.getByText('Bp 3 /')).toBeInTheDocument();
    await expect.element(bpLimit()).toHaveValue(40);

    await bpLimit().fill('45');
    await openSavedArmyList('Steel Hand');
    await expect.element(listName()).toHaveValue('Steel Hand');
    await expect.element(unitProfiles().getByText('Fist')).toBeInTheDocument();
    await expect.element(unitProfiles().getByText('Ironclad')).not.toBeInTheDocument();
    await expect.element(page.getByText('Bp 5 /')).toBeInTheDocument();
    await expect.element(bpLimit()).toHaveValue(60);

    await page.getByRole('button', { name: 'Add Mech' }).click();
    await expect.element(unitProfiles().getByText('New Mech')).toBeInTheDocument();
    await openSavedArmyList('Iron Legion');
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.element(bpLimit()).toHaveValue(45);
    await expect.element(unitProfiles().getByText('New Mech')).not.toBeInTheDocument();
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual({
      ...ironLegion,
      bpLimit: 45,
    });
    expect(JSON.parse(store.entries[armyListKey('list-2')]!).unitProfiles).toHaveLength(2);
  });

  it('shows when each changed, most recent first, naming a blank name as untitled', async () => {
    load(savedStore(ironLegion, { ...steelHand, name: ' ' }));
    await expect.poll(savedArmyListNames).toEqual(['Iron Legion', 'Untitled Army List']);
    await expect.poll(openArmyListText).toMatch(/^Iron Legion, /);

    await openSavedArmyList('Untitled Army List');
    await expect.element(listName()).toHaveValue(' ');
    await expect.poll(openArmyListText).toMatch(/^Untitled Army List, /);

    // The Open Army List's name follows its field, and an edit counts as a change.
    await listName().fill('Steel Hand');
    await expect
      .poll(savedArmyListTexts)
      .toEqual(['Steel Hand, just now', expect.stringMatching(/^Iron Legion, /)]);
  });

  it('only closes the menu when the Open Army List is chosen', async () => {
    load(savedStore(ironLegion, steelHand));
    await openSavedArmyList('Iron Legion');
    await expect.element(armyListsButton()).toHaveAttribute('aria-expanded', 'false');
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.poll(savedArmyListNames).toEqual(['Iron Legion', 'Steel Hand']);
  });

  it('reopens the list last open on reload', async () => {
    const store = savedStore(ironLegion, steelHand);
    load(store);
    await openSavedArmyList('Steel Hand');
    await expect.element(listName()).toHaveValue('Steel Hand');

    load(store);
    await expect.element(listName()).toHaveValue('Steel Hand');
  });

  it('opens a new, empty Army List with New Army List', async () => {
    const store = savedStore(ironLegion);
    load(store);
    await chooseFromMenu('New Army List');
    await expect.element(listName()).toHaveValue('New Army List');
    await expect.element(bpLimit()).toHaveValue(100);
    await expect.element(unitProfiles().getByText('Ironclad')).not.toBeInTheDocument();
    await expect.poll(savedArmyListNames).toEqual(['New Army List', 'Iron Legion']);
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual(ironLegion);
  });

  it('opens a copy with Duplicate Army List, leaving the original untouched by edits', async () => {
    const store = savedStore(ironLegion);
    load(store);
    await chooseFromMenu('Duplicate Army List');
    await expect.element(listName()).toHaveValue('Iron Legion (copy)');
    await expect.element(unitProfiles().getByText('Ironclad')).toBeInTheDocument();

    await bpLimit().fill('70');
    await expect.poll(() => JSON.parse(openDocument(store)!).bpLimit).toBe(70);
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual(ironLegion);
    await expect.poll(savedArmyListNames).toEqual(['Iron Legion (copy)', 'Iron Legion']);
  });

  it('deletes the Open Army List only once confirmed, then opens the most recent left', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const store = savedStore(ironLegion, steelHand);
    load(store);
    await chooseFromMenu('Delete Army List…');
    expect(confirm).toHaveBeenCalledWith("Delete Iron Legion? This can't be undone.");
    await expect.element(listName()).toHaveValue('Iron Legion');

    confirm.mockReturnValue(true);
    await chooseFromMenu('Delete Army List…');
    await expect.element(listName()).toHaveValue('Steel Hand');
    await expect.poll(savedArmyListNames).toEqual(['Steel Hand']);
    expect(store.entries[armyListKey('list-1')]).toBeUndefined();
    expect(JSON.parse(store.entries[armyListKey('list-2')]!)).toEqual(steelHand);
  });

  it('opens a new, empty Army List when the last one is deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    load(savedStore(ironLegion));
    await chooseFromMenu('Delete Army List…');
    await expect.element(listName()).toHaveValue('New Army List');
    await expect.element(unitProfiles().getByText('Ironclad')).not.toBeInTheDocument();
    await expect.poll(savedArmyListNames).toEqual(['New Army List']);
  });

  it('adds an imported file as a new list and opens it, leaving the Open Army List untouched', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const store = savedStore(steelHand);
    load(store);
    await importFile(JSON.stringify(ironLegion));
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.element(unitProfiles().getByText('Ironclad')).toBeInTheDocument();
    await expect.poll(savedArmyListNames).toEqual(['Iron Legion', 'Steel Hand']);
    expect(confirm).not.toHaveBeenCalled();
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual(steelHand);

    // The same file again: the input is cleared after each pick, so choosing it still imports.
    await importFile(JSON.stringify(ironLegion));
    await expect.poll(savedArmyListNames).toEqual(['Iron Legion', 'Iron Legion', 'Steel Hand']);
  });
});

describe('focus in the Army Lists menu', () => {
  const focused = () => document.activeElement;

  it.each<[string, () => Promise<void>]>([
    ['New Army List', () => chooseFromMenu('New Army List')],
    ['Duplicate Army List', () => chooseFromMenu('Duplicate Army List')],
    ['choosing another list', () => openSavedArmyList('Steel Hand')],
    ['a confirmed Delete', () => chooseFromMenu('Delete Army List…')],
    ['Import', () => importFile(JSON.stringify(steelHand))],
  ])('lands on the menu button after %s opens another list', async (_, act) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    load(savedStore(ironLegion, steelHand));
    await expect.element(listName()).toHaveValue('Iron Legion');
    await act();
    await expect.element(listName()).not.toHaveValue('Iron Legion');
    await expect.poll(focused).toBe(armyListsButton().element());
  });

  it.each<[string, () => Promise<void>]>([
    ['Export', () => chooseFromMenu('Export Army List')],
    ['a cancelled Delete', () => chooseFromMenu('Delete Army List…')],
    ['choosing the Open Army List', () => openSavedArmyList('Iron Legion')],
    [
      'a cancelled Import',
      async () => {
        await chooseFromMenu('Import Army List…');
        document.querySelector('input[type="file"]')!.dispatchEvent(new Event('cancel'));
      },
    ],
  ])('returns to the menu button after %s', async (_, act) => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // Stands in for the file picker, which a headless browser can't show.
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    load(savedStore(ironLegion, steelHand));
    await act();
    await expect.poll(focused).toBe(armyListsButton().element());
  });

  it('closes the menu when Tab leaves it', async () => {
    load(savedStore(ironLegion));
    await openArmyListsMenu();
    page.getByRole('button', { name: 'Where are Army Lists kept?' }).element().focus();
    await userEvent.tab();
    await expect.element(armyListsButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays open when something in it that takes no focus is clicked', async () => {
    load(savedStore(ironLegion));
    await openArmyListsMenu();
    page.getByRole('button', { name: 'Export Army List' }).element().focus();
    await page.getByText('Saved Army Lists', { exact: true }).click();
    await expect.element(armyListsButton()).toHaveAttribute('aria-expanded', 'true');
  });
});
