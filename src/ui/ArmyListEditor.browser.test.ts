import type { jsPDF } from 'jspdf';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { ArmyList } from '../domain/armyList';
import { quantityRange } from '../domain/profileFields';
import { savedArmyListKey } from '../domain/armyListStorage';
import type { MechProfile } from '../domain/mech';
import { fakeStore } from '../domain/testStores';
import type { VehicleProfile } from '../domain/vehicle';
import { exportArmyListPdf } from '../pdf/exportPdf';
import {
  cardField,
  cardMarks,
  importFile,
  openButton,
  profileFlags,
  profileRow,
  setUpApp,
  unitProfiles,
} from './testApp';

// Spied on, still real: the app imports it on demand when printing.
vi.mock('../pdf/exportPdf', { spy: true });

const load = setUpApp();

const loadList = (list: ArmyList) => load(fakeStore({ [savedArmyListKey]: JSON.stringify(list) }));
const addMech = () => page.getByRole('button', { name: 'Add Mech' }).click();

/** Starts the app with a fresh Army List and one new Mech selected. */
async function loadWithNewMech() {
  load(fakeStore());
  await addMech();
}

const field = (label: string) => page.getByLabelText(label, { exact: true });
/** A select, by its accessible name: its label's text also holds every option, so getByLabelText misses it. */
const picker = (name: string) => page.getByRole('combobox', { name, exact: true });
const issues = () => page.getByRole('region', { name: 'Issues' });
/** Too heavy for the default Light Mech. */
const heavyLeftArm = { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null };
const downloadPdf = () => page.getByRole('button', { name: 'Download PDF' });

/** Read once: poll it (`expect.poll`) to wait for renders. */
function optionTexts(name: string): string[] {
  const select = picker(name).element() as HTMLSelectElement;
  return Array.from(select.options, (option) => option.text);
}

describe('header', () => {
  it('shows the list name and the Bp total out of the Bp Limit', async () => {
    load(fakeStore());
    await expect.element(page.getByLabelText('Army List name')).toHaveValue('New Army List');
    await expect.element(page.getByText('Bp 0 /')).toBeInTheDocument();
    await expect.element(field('Bp Limit')).toHaveValue(50);

    await addMech();
    await field('Armor').fill('70');
    await expect.element(page.getByText('Bp 7 /')).toBeInTheDocument();
  });

  it('counts each Unit Profile once per copy fielded', async () => {
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Pair', armor: 40, quantity: 2 }),
        mech({ id: 'b', name: 'Reserve', armor: 70, quantity: 0 }),
      ],
    });
    await expect.element(page.getByText('Bp 8 /')).toBeInTheDocument();
  });

  it('warns while the Bp total is over the Bp Limit', async () => {
    await loadWithNewMech();
    await picker('Class').selectOptions('Heavy');
    await field('Armor').fill('120');
    await field('Bp Limit').fill('10');
    await expect.element(page.getByText('Over the Bp Limit by 2')).toBeInTheDocument();

    await field('Bp Limit').fill('12');
    await expect.element(page.getByText(/Over the Bp Limit/)).not.toBeInTheDocument();
  });
});

describe('Unit Profile list', () => {
  it('invites adding a Mech, Vehicle or Troop while the Army List is empty', async () => {
    load(fakeStore());
    await expect
      .element(page.getByText('Add a Mech, Vehicle or Troop to start building the Army List.'))
      .toBeInTheDocument();
  });

  it('shows Vehicles with their Bp and quantity, counted in the Bp total', async () => {
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Ironclad', armor: 60 }),
        vehicle({ id: 'b', name: 'Hauler', armor: 20, cargoBays: 1, quantity: 2 }),
      ],
    });
    await expect.element(profileRow('Hauler').getByText('3 Bp')).toBeInTheDocument();
    await expect.element(profileRow('Hauler').getByText('×2')).toBeInTheDocument();
    await expect.element(page.getByText('Bp 12 /')).toBeInTheDocument();

    await openButton('Hauler').click();
    await expect.element(field('Name')).toHaveValue('Hauler');
    await expect.element(field('Cargo Bays')).toHaveValue(1);
  });

  it('adds and selects a new Unit Profile with Add Mech', async () => {
    await loadWithNewMech();
    await addMech();

    const second = openButton('New Mech 2');
    await expect.element(second).toHaveAttribute('aria-current', 'true');
    await expect.element(openButton('New Mech')).not.toHaveAttribute('aria-current');
    await expect.element(field('Name')).toHaveValue('New Mech 2');
    expect(unitProfiles().getByRole('listitem').elements()).toHaveLength(2);
  });

  it('opens a Unit Profile in the editor when clicked', async () => {
    await loadWithNewMech();
    await addMech();

    const first = openButton('New Mech');
    await first.click();
    await expect.element(first).toHaveAttribute('aria-current', 'true');
    await expect.element(field('Name')).toHaveValue('New Mech');
  });

  it('groups Unit Profiles by kind, subtotalling each section, and keeps every Add reachable', async () => {
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        vehicle({ id: 'b', name: 'Hauler', armor: 20, cargoBays: 1, quantity: 2 }),
        mech({ id: 'a', name: 'Ironclad', armor: 60, quantity: 1 }),
      ],
    });
    const troops = page.getByRole('region', { name: /^Troops/ });
    const headings = unitProfiles().getByRole('heading');

    // Always Mechs, Vehicles then Troops, whatever order the Army List holds them in, each heading
    // carrying its section's Bp subtotal: one Ironclad at 6 Bp, two Haulers at 3 Bp, no Troops.
    await expect.element(headings.nth(0)).toHaveAccessibleName('Mechs 6 Bp');
    await expect.element(headings.nth(1)).toHaveAccessibleName('Vehicles 6 Bp');
    await expect.element(headings.nth(2)).toHaveAccessibleName('Troops 0 Bp');

    // An empty section still says so, and still offers its Add.
    await expect.element(troops.getByText('None')).toBeInTheDocument();
    await troops.getByRole('button', { name: 'Add Troop' }).click();
    await expect.element(openButton('New Troop')).toHaveAttribute('aria-current', 'true');
    await expect.element(troops.getByText('None')).not.toBeInTheDocument();
  });

  it('follows name and Bp edits, and marks a blank name', async () => {
    await loadWithNewMech();
    await field('Armor').fill('60');
    await expect.element(profileRow('New Mech').getByText('6 Bp')).toBeInTheDocument();
    await field('Name').fill('');
    await expect.element(unitProfiles().getByText('Unnamed')).toBeInTheDocument();
  });
});

describe("the selected Unit Profile's actions", () => {
  const twoMechList = (quantity = 1): ArmyList => ({
    version: 2,
    name: 'Iron Legion',
    bpLimit: 50,
    unitProfiles: [
      mech({ id: 'a', name: 'Ironclad', armor: 60, quantity }),
      mech({ id: 'b', name: 'Scout', armor: 30, quantity: 1 }),
    ],
  });

  const stepUp = (name: string) => page.getByRole('button', { name: `One more ${name}` });
  const stepDown = (name: string) => page.getByRole('button', { name: `One fewer ${name}` });
  /** The stepper's quantity, which the row repeats as `×N` whenever it isn't 1. */
  const quantityOf = (name: string) => profileRow(name).getByRole('status');

  it('draws them inside the selected row alone', async () => {
    loadList(twoMechList());
    await expect.element(quantityOf('Ironclad')).toBeInTheDocument();
    expect(quantityOf('Scout').query()).toBeNull();
    expect(profileRow('Scout').getByRole('button', { name: 'Delete Scout' }).query()).toBeNull();

    await openButton('Scout').click();
    await expect.element(quantityOf('Scout')).toBeInTheDocument();
    expect(quantityOf('Ironclad').query()).toBeNull();
  });

  it('steps the quantity, updating the row and the Bp total', async () => {
    loadList(twoMechList());
    await expect.element(page.getByText('Bp 9 /')).toBeInTheDocument();
    // A single copy is the usual case, so the row says nothing about it.
    expect(profileRow('Ironclad').getByText('×1').query()).toBeNull();

    await stepUp('Ironclad').click();
    await expect.element(quantityOf('Ironclad')).toHaveTextContent('2');
    await expect.element(profileRow('Ironclad').getByText('×2')).toBeInTheDocument();
    await expect.element(page.getByText('Bp 15 /')).toBeInTheDocument();

    await stepDown('Ironclad').click();
    await stepDown('Ironclad').click();
    await expect.element(profileRow('Ironclad').getByText('×0')).toBeInTheDocument();
    await expect.element(page.getByText('Bp 3 /')).toBeInTheDocument();
    // A quantity of 0 keeps the Unit Profile on the list without fielding it.
    await expect.element(profileRow('Ironclad')).toBeInTheDocument();
  });

  it('clamps the stepper to the quantity range rather than stepping out of it', async () => {
    loadList(twoMechList(0));
    await expect.element(stepDown('Ironclad')).toBeDisabled();
    await expect.element(stepUp('Ironclad')).toBeEnabled();

    loadList(twoMechList(quantityRange.max));
    await expect.element(stepUp('Ironclad')).toBeDisabled();
    await expect.element(stepDown('Ironclad')).toBeEnabled();
    await expect.element(page.getByText('Bp 603 /')).toBeInTheDocument();
  });

  it('duplicates a Unit Profile as an unfielded "(copy)", and opens it', async () => {
    loadList(twoMechList());
    await profileRow('Ironclad').getByRole('button', { name: 'Duplicate Ironclad' }).click();

    await expect.element(openButton('Ironclad (copy)')).toHaveAttribute('aria-current', 'true');
    await expect.element(field('Name')).toHaveValue('Ironclad (copy)');
    await expect.element(quantityOf('Ironclad (copy)')).toHaveTextContent('0');
    await expect.element(field('Armor')).toHaveValue(60);
    await expect.element(page.getByText('Bp 9 /')).toBeInTheDocument();
    // The copy follows the Unit Profile it came from, ahead of the rest of its section. A row's
    // button is the one named for its Unit Profile's Bp; every other button names an action.
    const rows = unitProfiles().getByRole('button', { name: /Bp$/ });
    await expect.element(rows.nth(0)).toHaveAccessibleName('Ironclad 6 Bp');
    await expect.element(rows.nth(1)).toHaveAccessibleName('Ironclad (copy) ×0 6 Bp');
    await expect.element(rows.nth(2)).toHaveAccessibleName('Scout 3 Bp');
  });

  it('deletes a Unit Profile only once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    loadList(twoMechList());
    const deleteIronclad = profileRow('Ironclad').getByRole('button', { name: 'Delete Ironclad' });

    await deleteIronclad.click();
    expect(confirm).toHaveBeenCalledWith('Delete Ironclad?');
    await expect.element(profileRow('Ironclad')).toBeInTheDocument();
    await expect.element(page.getByText('Bp 9 /')).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await deleteIronclad.click();
    await expect.element(profileRow('Ironclad')).not.toBeInTheDocument();
    await expect.element(page.getByText('Bp 3 /')).toBeInTheDocument();
    await expect.element(field('Name')).toHaveValue('Scout');
  });

  it('marks both Unit Profiles that share a name, without an Issue', async () => {
    loadList(twoMechList());
    expect(profileFlags()).toEqual([]);

    await field('Name').fill('Scout');
    expect(unitProfiles().getByRole('listitem').elements()).toHaveLength(2);
    await expect
      .poll(profileFlags)
      .toEqual(['Same name as another Unit Profile', 'Same name as another Unit Profile']);
    await expect
      .element(page.getByText('Another Unit Profile is also named Scout'))
      .toBeInTheDocument();
    expect(issues().query()).toBeNull();

    await field('Name').fill('Scout II');
    await expect.poll(profileFlags).toEqual([]);
  });
});

describe('Unit Profile editor', () => {
  it('updates the live card preview as fields change', async () => {
    await loadWithNewMech();
    await expect.poll(() => cardField('name')).toBe('New Mech');

    await field('Name').fill('Ironclad');
    await picker('Class').selectOptions('Heavy');
    await field('Armor').fill('110');
    await field('Heat Sinks').fill('1');
    await field('Engine Upgrades').fill('2');
    await field('Notes').fill('Jump jets');

    await expect.poll(() => cardField('name')).toBe('Ironclad');
    await expect.poll(() => cardField('class')).toBe('Heavy');
    await expect.poll(() => cardField('bp')).toBe('17');
    await expect.poll(() => cardField('mv')).toBe('4');
    await expect.poll(() => cardField('tp')).toBe('4');
    await expect.poll(() => cardField('hc')).toBe('5');
    await expect.poll(() => cardField('armor')).toBe('110');
    await expect.poll(() => cardField('notes')).toBe('Jump jets');
    await expect.element(page.getByRole('img', { name: 'Ironclad record card' })).toBeVisible();
  });

  it('works out Bp, Mv, Tp and Hc from the Class and upgrades, showing Bp against its max', async () => {
    await loadWithNewMech();
    await expect.element(field('Bp')).toHaveTextContent('1 / 8');
    await expect.element(field('Mv')).toHaveTextContent('5');
    await expect.element(field('Tp')).toHaveTextContent('5');
    await expect.element(field('Hc')).toHaveTextContent('4');

    await field('Armor').fill('20');
    await field('Heat Sinks').fill('2');
    await field('Engine Upgrades').fill('1');
    await expect.element(field('Bp')).toHaveTextContent('8 / 8');
    await expect.element(field('Mv')).toHaveTextContent('6');
    await expect.element(field('Tp')).toHaveTextContent('5');
    await expect.element(field('Hc')).toHaveTextContent('6');

    // Changing Class keeps the upgrades and works the stats out from the new Frame.
    await picker('Class').selectOptions('Heavy');
    await expect.element(field('Bp')).toHaveTextContent('8 / 20');
    await expect.element(field('Mv')).toHaveTextContent('4');
    await expect.element(field('Hc')).toHaveTextContent('6');
    await expect.element(profileRow('New Mech').getByText('8 Bp')).toBeInTheDocument();
  });

  it('holds an out-of-range value as a draft, then pulls it into range on blur', async () => {
    await loadWithNewMech();
    await expect.poll(() => cardField('mv')).toBe('5');
    await field('Engine Upgrades').fill('5');
    await expect.element(field('Engine Upgrades')).toHaveValue(5);
    // The input renders the draft in the same commit that would have rebuilt the card.
    expect(cardField('mv')).toBe('5');

    await field('Name').click();
    await expect.element(field('Engine Upgrades')).toHaveValue(2);
    await expect.poll(() => cardField('tp')).toBe('6');
  });

  // One case per rule; `numberRange.test.ts` covers the rest in Node.
  it.each([
    { rule: 'below the min', label: 'Heat Sinks', start: '5', typed: '-1', settled: 0 },
    { rule: 'above the max', label: 'Engine Upgrades', start: '1', typed: '5', settled: 2 },
    { rule: 'off the step', label: 'Armor', start: '80', typed: '55', settled: 60 },
  ])(
    'settles a value $rule on Enter ($label $typed to $settled)',
    async ({ label, start, typed, settled }) => {
      await loadWithNewMech();
      await field(label).fill(start);
      await field(label).fill(typed);
      await userEvent.keyboard('{Enter}');
      await expect.element(field(label)).toHaveValue(settled);
    },
  );

  it('keeps the last value when the typed text is not a number', async () => {
    await loadWithNewMech();
    await field('Heat Sinks').fill('4');
    await field('Heat Sinks').fill('');
    await field('Name').click();
    await expect.element(field('Heat Sinks')).toHaveValue(4);
  });
});

describe('Hardpoints', () => {
  it("offers entries of the Mech's Class or lighter", async () => {
    await loadWithNewMech();
    await expect.poll(() => optionTexts('Left Arm')).toContain('Light Laser');
    expect(optionTexts('Left Arm')).not.toContain('Medium Laser');

    await picker('Class').selectOptions('Medium');
    await expect.poll(() => optionTexts('Left Arm')).toContain('Medium Laser');
    expect(optionTexts('Left Arm')).not.toContain('Heavy Laser');
  });

  it('offers Support Equipment only on torso Hardpoints, and always an empty option', async () => {
    await loadWithNewMech();
    await expect.poll(() => optionTexts('Left Torso')).toContain('Remote Guided Missile System');
    for (const arm of ['Left Arm', 'Right Arm']) {
      expect(optionTexts(arm)[0]).toBe('Empty');
      expect(optionTexts(arm)).not.toContain('Remote Guided Missile System');
    }
    for (const torso of ['Left Torso', 'Right Torso']) {
      expect(optionTexts(torso)[0]).toBe('Empty');
      expect(optionTexts(torso)).toContain('Remote Guided Missile System');
    }
  });

  it('shows mounted entries on the live card preview, and clears them when emptied', async () => {
    await loadWithNewMech();
    await picker('Class').selectOptions('Heavy');
    await picker('Right Arm').selectOptions('Heavy Laser');
    await picker('Left Torso').selectOptions('Improved Weapon Targeting System');

    await expect.poll(() => cardField('ra-weapon')).toBe('Hv Laser');
    await expect.poll(() => cardField('ra-rv')).toBe('6/10');
    await expect.poll(() => cardField('ra-hv')).toBe('2');
    await expect.poll(() => cardField('lt-weapon')).toBe('IWTS');

    await picker('Right Arm').selectOptions('Empty');
    await expect.poll(() => cardField('ra-weapon')).toBeNull();
  });
});

describe('Issues', () => {
  it('keeps a mount that became too heavy after a Class change, and flags it', async () => {
    await loadWithNewMech();
    await picker('Class').selectOptions('Heavy');
    await picker('Left Arm').selectOptions('Heavy Laser');
    await picker('Right Arm').selectOptions('Heavy Cannon');
    await expect.poll(() => cardField('ra-weapon')).toBe('Hv Cannon');
    expect(issues().query()).toBeNull();

    await picker('Class').selectOptions('Light');
    await expect.element(picker('Left Arm')).toHaveDisplayValue('Heavy Laser (Issue)');
    await expect
      .element(issues().getByText("Left Arm: Heavy Laser is Heavy, heavier than the Mech's Class"))
      .toBeInTheDocument();
    await expect
      .element(
        issues().getByText("Right Arm: Heavy Cannon is Heavy, heavier than the Mech's Class"),
      )
      .toBeInTheDocument();
    await expect.poll(profileFlags).toEqual(['2 Issues']);
  });

  it('flags a Mech costing no Bp, until it costs some', async () => {
    await loadWithNewMech();
    await field('Armor').fill('0');
    await expect
      .element(issues().getByText('Bp is 0; a Mech must cost at least 1'))
      .toBeInTheDocument();
    await expect.poll(profileFlags).toEqual(['1 Issue']);

    await field('Armor').fill('10');
    await expect.element(issues()).not.toBeInTheDocument();
    await expect.poll(profileFlags).toEqual([]);
  });

  it("flags Bp over the Frame's max, and lets the upgrades go past it", async () => {
    await loadWithNewMech();
    await picker('Left Arm').selectOptions('Light Cannon');
    await field('Heat Sinks').fill('4');
    await expect.element(field('Heat Sinks')).toHaveValue(4);
    await expect
      .element(issues().getByText("Bp 11 is more than a Light Mech's max Bp of 8"))
      .toBeInTheDocument();
    await expect.poll(() => cardField('illegal')).toBe('ILLEGAL: Bp over max');

    await picker('Class').selectOptions('Medium');
    await expect.element(issues()).not.toBeInTheDocument();
    await expect.element(field('Bp')).toHaveTextContent('11 / 14');
  });

  it('flags Support Equipment on an arm and names missing from the Catalog, even at quantity 0', async () => {
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({
          id: 'a',
          name: 'Oddball',
          armor: 50,
          quantity: 0,
          hardpoints: {
            leftArm: 'Remote Guided Missile System',
            rightArm: 'Plasma Thrower',
            leftTorso: null,
            rightTorso: null,
          },
        }),
      ],
    });

    await expect
      .element(picker('Left Arm'))
      .toHaveDisplayValue('Remote Guided Missile System (Issue)');
    await expect
      .element(picker('Right Arm'))
      .toHaveDisplayValue('Plasma Thrower (not in the Catalog)');
    await expect
      .element(
        issues().getByText(
          'Left Arm: Remote Guided Missile System is Support Equipment, which only fits a torso Hardpoint',
        ),
      )
      .toBeInTheDocument();
    await expect
      .element(issues().getByText('Right Arm: Plasma Thrower is not in the Catalog'))
      .toBeInTheDocument();
    await expect.poll(profileFlags).toEqual(['2 Issues']);

    // Choosing another entry drops the unlisted one from the picker.
    await picker('Right Arm').selectOptions('Light Laser');
    await expect.poll(profileFlags).toEqual(['1 Issue']);
    expect(optionTexts('Right Arm')).not.toContain('Plasma Thrower (not in the Catalog)');
  });

  it('marks the card preview while the Unit Profile has Issues', async () => {
    await loadWithNewMech();
    await picker('Class').selectOptions('Heavy');
    await picker('Left Arm').selectOptions('Heavy Laser');
    await field('Armor').fill('50');
    await expect.poll(() => cardField('armor')).not.toBeNull();
    expect(cardMarks()).toEqual([]);

    await picker('Class').selectOptions('Light');
    await expect.poll(() => cardField('illegal')).toMatch(/^ILLEGAL: /);
    expect(cardMarks()).toEqual(['illegal', 'la-illegal']);

    await picker('Class').selectOptions('Heavy');
    await expect.poll(() => cardField('illegal')).toBeNull();
    expect(cardMarks()).toEqual([]);
  });

  it('marks only the Unit Profiles with Issues in the list', async () => {
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Sound' }),
        mech({
          id: 'b',
          name: 'Flawed',
          hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
        }),
      ],
    });

    await expect.element(profileRow('Flawed').getByRole('img')).toHaveAccessibleName('1 Issue');
    expect(profileRow('Sound').getByRole('img').query()).toBeNull();
    // The first Unit Profile is open, and has none to list.
    await expect.element(field('Name')).toHaveValue('Sound');
    expect(issues().query()).toBeNull();
  });
});

describe('Vehicles', () => {
  const addVehicle = () => page.getByRole('button', { name: 'Add Vehicle' }).click();
  const checkbox = (name: string) => page.getByRole('checkbox', { name, exact: true });

  /** Starts the app with a fresh Army List and one new Vehicle selected. */
  async function loadWithNewVehicle() {
    load(fakeStore());
    await addVehicle();
  }

  it('adds and opens a new Vehicle, with its own fields and worked-out stats', async () => {
    await loadWithNewVehicle();
    await expect.element(openButton('New Vehicle')).toHaveAttribute('aria-current', 'true');
    await expect.element(field('Name')).toHaveValue('New Vehicle');
    await expect.poll(() => optionTexts('Class')).toEqual(['Ultra-light', 'Light', 'Medium']);
    await expect.element(picker('Class')).toHaveValue('Light');
    expect(field('Heat Sinks').query()).toBeNull();
    expect(field('Hc').query()).toBeNull();
    await expect.element(field('Bp')).toHaveTextContent('1 / 5');
    await expect.element(field('Mv')).toHaveTextContent('4');
    await expect.element(field('Tp')).toHaveTextContent('4');

    await field('Armor').fill('30');
    await field('Engine Upgrades').fill('1');
    await expect.element(field('Bp')).toHaveTextContent('5 / 5');
    await expect.element(field('Mv')).toHaveTextContent('5');
    await expect.element(profileRow('New Vehicle').getByText('5 Bp')).toBeInTheDocument();

    await picker('Class').selectOptions('Ultra-light');
    await expect.element(field('Bp')).toHaveTextContent('5 / 4');
    await expect.element(field('Mv')).toHaveTextContent('6');
    await expect
      .element(issues().getByText("Bp 5 is more than an Ultra-light Vehicle's max Bp of 4"))
      .toBeInTheDocument();
  });

  it('takes a Turret, offering what its Class may mount, and empties it when unticked', async () => {
    await loadWithNewVehicle();
    expect(picker('Turret').query()).toBeNull();

    await checkbox('Turret').click();
    await expect.element(field('Hull Options')).toHaveTextContent('1 / 2');
    await expect.poll(() => optionTexts('Turret')).toContain('Light Laser');
    expect(optionTexts('Turret')[0]).toBe('Empty');
    expect(optionTexts('Turret')).toContain('Remote Guided Missile System');
    expect(optionTexts('Turret')).not.toContain('Medium Laser');

    await picker('Turret').selectOptions('Light Cannon');
    await expect.element(field('Bp')).toHaveTextContent('3 / 5');
    await expect.element(profileRow('New Vehicle').getByText('3 Bp')).toBeInTheDocument();

    await picker('Class').selectOptions('Medium');
    await expect.poll(() => optionTexts('Turret')).toContain('Medium Laser');
    expect(optionTexts('Turret')).not.toContain('Heavy Laser');

    await checkbox('Turret').click();
    await expect.element(picker('Turret')).not.toBeInTheDocument();
    await expect.element(field('Bp')).toHaveTextContent('1 / 6');
    await checkbox('Turret').click();
    await expect.element(picker('Turret')).toHaveDisplayValue('Empty');
  });

  it('takes a Static Mount with two pickers, and flags going over the Hull Options', async () => {
    await loadWithNewVehicle();
    await checkbox('Static Mount').click();
    await expect.element(field('Hull Options')).toHaveTextContent('2 / 2');
    await picker('Static Mount 1').selectOptions('Light Laser');
    await picker('Static Mount 2').selectOptions('Light Missile');
    await expect.element(field('Bp')).toHaveTextContent('3 / 5');
    expect(issues().query()).toBeNull();

    await checkbox('Turret').click();
    await field('Cargo Bays').fill('2');
    await expect.element(field('Hull Options')).toHaveTextContent('5 / 2');
    await expect
      .element(issues().getByText("5 Hull Options is more than a Light Vehicle's 2"))
      .toBeInTheDocument();
    await expect.poll(profileFlags).toEqual(['1 Issue']);

    await checkbox('Static Mount').click();
    await field('Cargo Bays').fill('1');
    await expect.element(field('Hull Options')).toHaveTextContent('2 / 2');
    await expect.element(issues()).not.toBeInTheDocument();
    await expect.element(field('Bp')).toHaveTextContent('2 / 5');
  });

  it.each([
    { hullOption: 'Turret', mounts: ['Turret'] },
    { hullOption: 'Static Mount', mounts: ['Static Mount 1', 'Static Mount 2'] },
  ])(
    'keeps $hullOption mounts that became too heavy after a Class change, and flags them',
    async ({ hullOption, mounts }) => {
      await loadWithNewVehicle();
      await picker('Class').selectOptions('Medium');
      await checkbox(hullOption).click();
      for (const mount of mounts) await picker(mount).selectOptions('Medium Laser');
      // Plus the 1 Bp of the default 10 Armor.
      await expect.element(field('Bp')).toHaveTextContent(`${2 * mounts.length + 1} / 6`);
      expect(issues().query()).toBeNull();

      await picker('Class').selectOptions('Light');
      for (const mount of mounts) {
        await expect.element(picker(mount)).toHaveDisplayValue('Medium Laser (Issue)');
        await expect
          .element(
            issues().getByText(
              `${mount}: Medium Laser is Medium, heavier than the Vehicle's Class may mount`,
            ),
          )
          .toBeInTheDocument();
      }
      // A Light Vehicle's max Bp is 5, so two Medium Lasers stay within it: only the mount Issues.
      const count = mounts.length === 1 ? '1 Issue' : `${mounts.length} Issues`;
      await expect.poll(profileFlags).toEqual([count]);
    },
  );

  it('previews the card with its mount rows, marked while the Vehicle has Issues', async () => {
    await loadWithNewVehicle();
    await field('Armor').fill('10');
    await checkbox('Turret').click();
    await picker('Turret').selectOptions('Light Laser');
    await expect.poll(() => cardField('mount1-weapon')).toBe('Turret: Light Laser');
    await expect.element(page.getByRole('img', { name: 'New Vehicle record card' })).toBeVisible();
    expect(cardMarks()).toEqual([]);

    await checkbox('Static Mount').click();
    await picker('Static Mount 2').selectOptions('Light Machine Gun');
    await expect.poll(() => cardField('mount2-weapon')).toBe('Static: Light Machine Gun');
    await expect.poll(() => cardField('illegal')).toBe('ILLEGAL: Hull Options over');
    expect(cardMarks()).toEqual(['illegal']);
  });
});

describe('Troops', () => {
  const addTroop = () => page.getByRole('button', { name: 'Add Troop' }).click();

  /** Starts the app with a fresh Army List and one new Troop selected. */
  async function loadWithNewTroop() {
    load(fakeStore());
    await addTroop();
  }

  it('adds and opens a new Troop, with its own fields and worked-out stats', async () => {
    await loadWithNewTroop();
    await expect.element(openButton('New Troop')).toHaveAttribute('aria-current', 'true');
    await expect.element(field('Name')).toHaveValue('New Troop');
    await expect
      .poll(() => optionTexts('Class'))
      .toEqual(['Light Infantry', 'Heavy Infantry', 'Jump Infantry']);
    await expect.element(picker('Class')).toHaveValue('Light Infantry');
    expect(field('Armor').query()).toBeNull();
    await expect.element(field('Bp')).toHaveTextContent('2 / 4');
    await expect.element(field('Mv')).toHaveTextContent('3');
    await expect.element(field('Tp')).toHaveTextContent('4');
    await expect.element(field('Sv')).toHaveTextContent('5');
    await expect.element(field('Standard Equipment')).toHaveTextContent('Individual Weapons');
    await expect.element(picker('Crew Served Weapon')).toHaveDisplayValue('Empty');

    await field('Notes').fill('Holds the ridge');
    // The label's text now holds the typed notes too, so find the textarea by role.
    await expect
      .element(page.getByRole('textbox', { name: 'Notes' }))
      .toHaveValue('Holds the ridge');
    expect(issues().query()).toBeNull();
  });

  it('previews the card, marked while the Troop has Issues', async () => {
    await loadWithNewTroop();
    await field('Notes').fill('Holds the ridge');
    await picker('Crew Served Weapon').selectOptions('Light Missile');
    await expect.element(page.getByRole('img', { name: 'New Troop record card' })).toBeVisible();
    await expect.poll(() => cardField('weapon')).toBe('Light Missile');
    expect(cardField('type')).toBe('Light Infantry');
    expect(cardField('sv')).toBe('5');
    expect(cardField('rv')).toBe('3-10/14');
    expect(cardField('standard-equipment')).toBe('Individual Weapons');
    expect(cardField('notes')).toBe('Holds the ridge');
    expect(cardMarks()).toEqual([]);

    await picker('Class').selectOptions('Jump Infantry');
    await picker('Crew Served Weapon').selectOptions('Light Laser');
    await expect.poll(() => cardField('standard-equipment')).toBe('Individual Weapons, Jump Packs');
    expect(cardField('illegal')).toBeNull();

    await picker('Class').selectOptions('Light Infantry');
    await picker('Crew Served Weapon').selectOptions('Light Cannon');
    await picker('Class').selectOptions('Jump Infantry');
    await expect.poll(() => cardField('illegal')).toBe('ILLEGAL: Bp over max');
    expect(cardMarks()).toEqual(['illegal']);
  });

  it('works out Bp as a Crew Served Weapon is picked', async () => {
    await loadWithNewTroop();
    await picker('Crew Served Weapon').selectOptions('Light Cannon');
    await expect.element(field('Bp')).toHaveTextContent('4 / 4');
    await expect.element(profileRow('New Troop').getByText('4 Bp')).toBeInTheDocument();
    await expect.element(page.getByText('Bp 4 /')).toBeInTheDocument();

    await picker('Class').selectOptions('Heavy Infantry');
    await expect.element(field('Bp')).toHaveTextContent('5 / 5');
    await expect.element(field('Sv')).toHaveTextContent('10');
  });

  it('offers the Light entries each Troop Class can afford', async () => {
    await loadWithNewTroop();
    const lightExceptAp = [
      'Empty',
      'Light Cannon',
      'Light Laser',
      'Light Laser (Twin Linked)',
      'Light Machine Gun',
      'Light Machine Gun (Twin Linked)',
      'Light Missile',
      'Remote Guided Missile System',
      'Anti-Missile Defense System',
    ];
    await expect.poll(() => optionTexts('Crew Served Weapon')).toEqual(lightExceptAp);

    await picker('Class').selectOptions('Jump Infantry');
    await expect
      .poll(() => optionTexts('Crew Served Weapon'))
      .toEqual([
        'Empty',
        'Light Laser',
        'Light Machine Gun',
        'Light Missile',
        'Remote Guided Missile System',
        'Anti-Missile Defense System',
      ]);
    await expect
      .element(field('Standard Equipment'))
      .toHaveTextContent('Individual Weapons, Jump Packs');
    await expect.element(field('Mv')).toHaveTextContent('4');

    await picker('Class').selectOptions('Heavy Infantry');
    await expect.poll(() => optionTexts('Crew Served Weapon')).toEqual(lightExceptAp);
  });

  it('keeps a Crew Served Weapon the new Class can no longer afford, and flags Bp over max', async () => {
    await loadWithNewTroop();
    await picker('Crew Served Weapon').selectOptions('Light Cannon');
    await expect.element(field('Bp')).toHaveTextContent('4 / 4');
    expect(issues().query()).toBeNull();

    await picker('Class').selectOptions('Jump Infantry');
    await expect.element(picker('Crew Served Weapon')).toHaveDisplayValue('Light Cannon (Issue)');
    await expect.element(field('Bp')).toHaveTextContent('7 / 6');
    await expect
      .element(issues().getByText("Bp 7 is more than a Jump Infantry Troop's max Bp of 6"))
      .toBeInTheDocument();
    await expect.poll(profileFlags).toEqual(['1 Issue']);

    await picker('Crew Served Weapon').selectOptions('Light Laser');
    await expect.element(issues()).not.toBeInTheDocument();
    expect(optionTexts('Crew Served Weapon')).not.toContain('Light Cannon (Issue)');
  });

  it('shows Troops with their Bp and quantity, counted in the Bp total', async () => {
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Ironclad', armor: 60 }),
        {
          kind: 'Troop',
          id: 'b',
          name: 'Skyborne',
          class: 'Jump Infantry',
          crewServedWeapon: 'Light Missile',
          notes: '',
          quantity: 2,
        },
      ],
    });
    await expect.element(profileRow('Skyborne').getByText('6 Bp')).toBeInTheDocument();
    await expect.element(profileRow('Skyborne').getByText('×2')).toBeInTheDocument();
    await expect.element(page.getByText('Bp 18 /')).toBeInTheDocument();

    await openButton('Skyborne').click();
    await expect.element(field('Name')).toHaveValue('Skyborne');
    await expect.element(picker('Crew Served Weapon')).toHaveDisplayValue('Light Missile');
  });
});

describe('Download PDF', () => {
  it('is unavailable while no copy is fielded', async () => {
    load(fakeStore());
    await expect.element(downloadPdf()).toBeDisabled();

    await addMech();
    await expect.element(downloadPdf()).toBeEnabled();
    await page.getByRole('button', { name: 'One fewer New Mech' }).click();
    await expect.element(downloadPdf()).toBeDisabled();
  });

  it('saves the whole Army List at the chosen print size', async () => {
    const links: HTMLAnchorElement[] = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const element = createElement(tagName, options);
        if (element instanceof HTMLAnchorElement) {
          // Stops the browser actually downloading the file.
          element.addEventListener('click', (event) => event.preventDefault());
          links.push(element);
        }
        return element;
      },
    );
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const list: ArmyList = {
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Pair', quantity: 2 }),
        mech({ id: 'b', name: 'Reserve', quantity: 0 }),
      ],
    };
    loadList(list);
    await expect.element(picker('Print size')).toHaveValue('large');
    await picker('Print size').selectOptions('Sleeve');

    await downloadPdf().click();
    await vi.waitFor(
      () => expect(links.map(({ download }) => download)).toContain('mech-attack-cards.pdf'),
      { timeout: 10_000 },
    );
    const blob = createObjectURL.mock.calls.at(-1)?.[0] as Blob;
    expect(blob.type).toBe('application/pdf');

    expect(vi.mocked(exportArmyListPdf)).toHaveBeenCalledOnce();
    const [printed, size] = vi.mocked(exportArmyListPdf).mock.calls[0] ?? [];
    expect(printed).toEqual(list);
    expect(size).toBe('sleeve');
    await expect.element(downloadPdf()).toBeEnabled();
    expect(page.getByText(/Couldn't build the PDF/).query()).toBeNull();
  });

  it('asks before printing fielded Unit Profiles with Issues', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Sound' }),
        mech({ id: 'b', name: 'Cheap', hardpoints: heavyLeftArm }),
        mech({ id: 'c', name: 'Flawed', quantity: 2, hardpoints: heavyLeftArm }),
        vehicle({ id: 'd', name: 'Overloaded', cargoBays: 2, turret: true }),
        {
          kind: 'Troop',
          id: 'e',
          name: 'Heavy Handed',
          class: 'Light Infantry',
          crewServedWeapon: 'Medium Laser',
          notes: '',
          quantity: 1,
        },
      ],
    });

    await downloadPdf().click();
    expect(confirm).toHaveBeenCalledWith(
      'Cheap, Flawed, Overloaded and Heavy Handed have Issues, so their cards print marked ILLEGAL. Download the PDF anyway?',
    );
    expect(vi.mocked(exportArmyListPdf)).not.toHaveBeenCalled();

    const save = vi.fn();
    vi.mocked(exportArmyListPdf).mockResolvedValueOnce({ save } as unknown as jsPDF);
    confirm.mockReturnValue(true);
    await downloadPdf().click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledWith('mech-attack-cards.pdf'));
  });

  it("doesn't ask about Issues on Unit Profiles that aren't fielded", async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const save = vi.fn();
    vi.mocked(exportArmyListPdf).mockResolvedValueOnce({ save } as unknown as jsPDF);
    loadList({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Sound' }),
        mech({ id: 'b', name: 'Shelved', quantity: 0, hardpoints: heavyLeftArm }),
      ],
    });

    await downloadPdf().click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('Export and Import JSON', () => {
  const ironLegion: ArmyList = {
    version: 2,
    name: 'Iron Legion',
    bpLimit: 40,
    unitProfiles: [
      mech({ id: 'a', name: 'Ironclad', quantity: 2 }),
      vehicle({ id: 'b', name: 'Hellhound' }),
    ],
  };
  const steelHand: ArmyList = {
    version: 2,
    name: 'Steel Hand',
    bpLimit: 60,
    unitProfiles: [mech({ id: 'a', name: 'Fist' })],
  };
  const listName = () => page.getByLabelText('Army List name');
  it('exports the saved document, named after the Army List, and imports it back', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const store = fakeStore({ [savedArmyListKey]: JSON.stringify(ironLegion) });
    load(store);

    await page.getByRole('button', { name: 'Export JSON' }).click();
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('iron-legion.json');
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('application/json');
    const exported = await blob.text();
    expect(exported).toBe(store.entries[savedArmyListKey]);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    loadList(steelHand);
    await expect.element(listName()).toHaveValue('Steel Hand');
    await importFile(exported);
    await expect.element(listName()).toHaveValue('Iron Legion');
    expect(confirm).toHaveBeenCalledWith(
      "Replace Steel Hand with Iron Legion from army.json? This can't be undone.",
    );
    await expect.element(unitProfiles().getByText('Hellhound')).toBeInTheDocument();
    await expect.element(field('Name')).toHaveValue('Ironclad');
  });

  it('replaces the Army List only once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    loadList(steelHand);
    await importFile(JSON.stringify(ironLegion));
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    await expect.element(listName()).toHaveValue('Steel Hand');

    confirm.mockReturnValue(true);
    // The same file again: the input is cleared after each pick, so choosing it still imports.
    await importFile(JSON.stringify(ironLegion));
    await expect.element(listName()).toHaveValue('Iron Legion');
  });

  it('names unnamed Army Lists in the confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    loadList({ ...steelHand, name: '' });
    await importFile(JSON.stringify({ ...ironLegion, name: ' ' }));
    await vi.waitFor(() =>
      expect(confirm).toHaveBeenCalledWith(
        "Replace the current Army List with the Army List from army.json? This can't be undone.",
      ),
    );
  });

  it.each([
    ['a file that is not JSON', 'not json at all'],
    ['JSON the schema rejects', JSON.stringify({ ...ironLegion, bpLimit: -5 })],
  ])('rejects %s, keeping the Army List and showing an error', async (_, text) => {
    const confirm = vi.spyOn(window, 'confirm');
    const store = fakeStore({ [savedArmyListKey]: JSON.stringify(steelHand) });
    load(store);
    await importFile(text, 'broken.json');
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent("Couldn't import broken.json: it isn't a readable Army List.");
    await expect.element(listName()).toHaveValue('Steel Hand');
    expect(confirm).not.toHaveBeenCalled();
    expect(JSON.parse(store.entries[savedArmyListKey]!)).toEqual(steelHand);
  });

  it('reports a file the browser could not read, keeping the Army List', async () => {
    vi.spyOn(Blob.prototype, 'text').mockRejectedValue(
      new DOMException('The file could not be read', 'NotReadableError'),
    );
    const confirm = vi.spyOn(window, 'confirm');
    loadList(steelHand);
    await importFile(JSON.stringify(ironLegion), 'moved.json');
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent("Couldn't read moved.json, so nothing was imported.");
    await expect.element(listName()).toHaveValue('Steel Hand');
    expect(confirm).not.toHaveBeenCalled();
  });
});

function mech(profile: Partial<MechProfile> & Pick<MechProfile, 'id' | 'name'>): MechProfile {
  return {
    kind: 'Mech',
    class: 'Light',
    // 1 Bp, so the default Mech is Legal.
    armor: 10,
    heatSinks: 0,
    engineUpgrades: 0,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
    ...profile,
  };
}

function vehicle(
  profile: Partial<VehicleProfile> & Pick<VehicleProfile, 'id' | 'name'>,
): VehicleProfile {
  return {
    kind: 'Vehicle',
    class: 'Light',
    // 1 Bp, so the default Vehicle is Legal.
    armor: 10,
    engineUpgrades: 0,
    turret: false,
    staticMount: false,
    cargoBays: 0,
    notes: '',
    mounts: { turret: null, staticMount1: null, staticMount2: null },
    quantity: 1,
    ...profile,
  };
}
