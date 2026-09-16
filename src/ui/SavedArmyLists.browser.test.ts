import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { ArmyList } from '../domain/armyList';
import { armyListKey } from '../domain/armyListStorage';
import { openDocument, savedStore } from '../domain/testStores';
import { importFile, setUpApp, unitProfiles } from './testApp';

const load = setUpApp();

const listName = () => page.getByLabelText('Army List name');
const bpLimit = () => page.getByLabelText('Bp Limit', { exact: true });
const savedLists = () => page.getByRole('combobox', { name: 'Saved Army Lists' });
const button = (name: string) => page.getByRole('button', { name, exact: true });

/** What each option says, most recently changed first. Read once: poll it to wait for renders. */
const optionTexts = () =>
  Array.from((savedLists().element() as HTMLSelectElement).options, (option) => option.text);
/** Each option's name, without the time it changed. */
const optionNames = () => optionTexts().map((text) => text.split(' · ')[0]);

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
    await savedLists().selectOptions('list-2');
    await expect.element(listName()).toHaveValue('Steel Hand');
    await expect.element(unitProfiles().getByText('Fist')).toBeInTheDocument();
    await expect.element(unitProfiles().getByText('Ironclad')).not.toBeInTheDocument();
    await expect.element(page.getByText('Bp 5 /')).toBeInTheDocument();
    await expect.element(bpLimit()).toHaveValue(60);

    await page.getByRole('button', { name: 'Add Mech' }).click();
    await expect.element(unitProfiles().getByText('New Mech')).toBeInTheDocument();
    await savedLists().selectOptions('list-1');
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.element(bpLimit()).toHaveValue(45);
    await expect.element(unitProfiles().getByText('New Mech')).not.toBeInTheDocument();
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual({
      ...ironLegion,
      bpLimit: 45,
    });
    expect(JSON.parse(store.entries[armyListKey('list-2')]!).unitProfiles).toHaveLength(2);
  });

  it('shows the most recently changed first, naming a blank name as untitled', async () => {
    load(savedStore(ironLegion, { ...steelHand, name: ' ' }));
    await expect.poll(optionNames).toEqual(['Iron Legion', 'Untitled Army List']);

    await savedLists().selectOptions('list-2');
    await expect.element(listName()).toHaveValue(' ');
    await expect.poll(optionNames).toEqual(['Iron Legion', 'Untitled Army List']);

    await listName().fill('Steel Hand');
    // Closed, the picker shows names only; in use, it shows when each changed, an edit counting.
    await expect.poll(optionTexts).toEqual(['Iron Legion', 'Steel Hand']);
    await savedLists().click();
    await expect
      .poll(optionTexts)
      .toEqual(['Steel Hand · just now', expect.stringMatching(/^Iron Legion · /)]);

    await listName().click();
    await expect.poll(optionTexts).toEqual(['Steel Hand', 'Iron Legion']);
  });

  it('reopens the list last open on reload', async () => {
    const store = savedStore(ironLegion, steelHand);
    load(store);
    await savedLists().selectOptions('list-2');
    await expect.element(listName()).toHaveValue('Steel Hand');

    load(store);
    await expect.element(listName()).toHaveValue('Steel Hand');
  });

  it('opens a new, empty Army List with New Army List', async () => {
    const store = savedStore(ironLegion);
    load(store);
    await button('New Army List').click();
    await expect.element(listName()).toHaveValue('New Army List');
    await expect.element(bpLimit()).toHaveValue(50);
    await expect.element(unitProfiles().getByText('Ironclad')).not.toBeInTheDocument();
    await expect.poll(optionNames).toEqual(['New Army List', 'Iron Legion']);
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual(ironLegion);
  });

  it('opens a copy with Duplicate Army List, leaving the original untouched by edits', async () => {
    const store = savedStore(ironLegion);
    load(store);
    await button('Duplicate Army List').click();
    await expect.element(listName()).toHaveValue('Iron Legion (copy)');
    await expect.element(unitProfiles().getByText('Ironclad')).toBeInTheDocument();

    await bpLimit().fill('70');
    await expect.poll(() => JSON.parse(openDocument(store)!).bpLimit).toBe(70);
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual(ironLegion);
    await expect.poll(optionNames).toEqual(['Iron Legion (copy)', 'Iron Legion']);
  });

  it('deletes the Open Army List only once confirmed, then opens the most recent left', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const store = savedStore(ironLegion, steelHand);
    load(store);
    await button('Delete Army List').click();
    expect(confirm).toHaveBeenCalledWith("Delete Iron Legion? This can't be undone.");
    await expect.element(listName()).toHaveValue('Iron Legion');

    confirm.mockReturnValue(true);
    await button('Delete Army List').click();
    await expect.element(listName()).toHaveValue('Steel Hand');
    await expect.poll(optionNames).toEqual(['Steel Hand']);
    expect(store.entries[armyListKey('list-1')]).toBeUndefined();
    expect(JSON.parse(store.entries[armyListKey('list-2')]!)).toEqual(steelHand);
  });

  it('opens a new, empty Army List when the last one is deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    load(savedStore(ironLegion));
    await button('Delete Army List').click();
    await expect.element(listName()).toHaveValue('New Army List');
    await expect.element(unitProfiles().getByText('Ironclad')).not.toBeInTheDocument();
    await expect.poll(optionNames).toEqual(['New Army List']);
  });

  it('adds an imported file as a new list and opens it, leaving the Open Army List untouched', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const store = savedStore(steelHand);
    load(store);
    await importFile(JSON.stringify(ironLegion));
    await expect.element(listName()).toHaveValue('Iron Legion');
    await expect.element(unitProfiles().getByText('Ironclad')).toBeInTheDocument();
    await expect.poll(optionNames).toEqual(['Iron Legion', 'Steel Hand']);
    expect(confirm).not.toHaveBeenCalled();
    expect(JSON.parse(store.entries[armyListKey('list-1')]!)).toEqual(steelHand);

    // The same file again: the input is cleared after each pick, so choosing it still imports.
    await importFile(JSON.stringify(ironLegion));
    await expect.poll(optionNames).toEqual(['Iron Legion', 'Iron Legion', 'Steel Hand']);
  });
});
