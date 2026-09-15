import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { ArmyList } from '../domain/armyList';
import { savedArmyListKey } from '../domain/armyListStorage';
import type { MechProfile } from '../domain/mech';
import { fakeStore } from '../domain/testStores';
import { exportCardsPdf } from '../pdf/exportPdf';
import { cardField, setUpApp, unitProfiles } from './testApp';

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
const downloadPdf = () => page.getByRole('button', { name: 'Download PDF' });
const profileRow = (name: string) =>
  unitProfiles()
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) });
/** The row's first button, which opens the Unit Profile in the editor. */
const openButton = (name: string) => profileRow(name).getByRole('button').first();

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
    await field('Bp').fill('7');
    await expect.element(page.getByText('Bp 7 /')).toBeInTheDocument();
  });

  it('counts each Unit Profile once per copy fielded', async () => {
    loadList({
      version: 1,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({ id: 'a', name: 'Pair', bp: 4, quantity: 2 }),
        mech({ id: 'b', name: 'Reserve', bp: 9, quantity: 0 }),
      ],
    });
    await expect.element(page.getByText('Bp 8 /')).toBeInTheDocument();
  });

  it('warns while the Bp total is over the Bp Limit', async () => {
    await loadWithNewMech();
    await field('Bp').fill('12');
    await field('Bp Limit').fill('10');
    await expect.element(page.getByText('Over the Bp Limit by 2')).toBeInTheDocument();

    await field('Bp Limit').fill('12');
    await expect.element(page.getByText(/Over the Bp Limit/)).not.toBeInTheDocument();
  });
});

describe('Unit Profile list', () => {
  it('invites adding a Mech while the Army List is empty', async () => {
    load(fakeStore());
    await expect
      .element(page.getByText('Add a Mech to start building the Army List.'))
      .toBeInTheDocument();
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

  it('follows name and Bp edits, and marks a blank name', async () => {
    await loadWithNewMech();
    await field('Bp').fill('6');
    await expect.element(unitProfiles().getByText('6 Bp')).toBeInTheDocument();
    await field('Name').fill('');
    await expect.element(unitProfiles().getByText('Unnamed')).toBeInTheDocument();
  });
});

describe('quantity, Duplicate and Delete', () => {
  const twoMechList = (): ArmyList => ({
    version: 1,
    name: 'Iron Legion',
    bpLimit: 50,
    unitProfiles: [
      mech({ id: 'a', name: 'Ironclad', bp: 6, quantity: 1 }),
      mech({ id: 'b', name: 'Scout', bp: 3, quantity: 1 }),
    ],
  });

  it('updates the Bp total as the quantity steps, down to 0', async () => {
    loadList(twoMechList());
    await expect.element(page.getByText('Bp 9 /')).toBeInTheDocument();

    const quantity = profileRow('Ironclad').getByLabelText('Qty');
    await quantity.fill('3');
    await expect.element(page.getByText('Bp 21 /')).toBeInTheDocument();
    await quantity.fill('0');
    await expect.element(page.getByText('Bp 3 /')).toBeInTheDocument();
    await expect.element(profileRow('Ironclad')).toBeInTheDocument();

    await quantity.fill('-2');
    await field('Name').click();
    await expect.element(quantity).toHaveValue(0);
  });

  it('duplicates a Unit Profile as an unfielded "(copy)", and opens it', async () => {
    loadList(twoMechList());
    await profileRow('Ironclad').getByRole('button', { name: 'Duplicate Ironclad' }).click();

    await expect.element(openButton('Ironclad (copy)')).toHaveAttribute('aria-current', 'true');
    await expect.element(field('Name')).toHaveValue('Ironclad (copy)');
    await expect.element(profileRow('Ironclad (copy)').getByLabelText('Qty')).toHaveValue(0);
    await expect.element(field('Bp')).toHaveValue(6);
    await expect.element(page.getByText('Bp 9 /')).toBeInTheDocument();
    expect(
      unitProfiles()
        .getByRole('button', { name: /^Delete / })
        .elements()
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Delete Ironclad', 'Delete Ironclad (copy)', 'Delete Scout']);
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

  it('flags both Unit Profiles that share a name, without an Issue', async () => {
    loadList(twoMechList());
    await expect.element(unitProfiles().getByText('Same name')).not.toBeInTheDocument();

    await field('Name').fill('Scout');
    expect(unitProfiles().getByRole('listitem').elements()).toHaveLength(2);
    await expect.poll(() => unitProfiles().getByText('Same name').elements()).toHaveLength(2);
    await expect
      .element(page.getByText('Another Unit Profile is also named Scout'))
      .toBeInTheDocument();
    expect(unitProfiles().getByText(/Issue/).query()).toBeNull();
    expect(issues().query()).toBeNull();

    await field('Name').fill('Scout II');
    await expect.element(unitProfiles().getByText('Same name')).not.toBeInTheDocument();
    await expect.element(page.getByText(/Another Unit Profile/)).not.toBeInTheDocument();
  });
});

describe('Unit Profile editor', () => {
  it('updates the live card preview as fields change', async () => {
    await loadWithNewMech();
    await expect.poll(() => cardField('name')).toBe('New Mech');

    await field('Name').fill('Ironclad');
    await picker('Class').selectOptions('Heavy');
    await field('Bp').fill('18');
    await field('Mv').fill('4');
    await field('Tp').fill('2');
    await field('Hc').fill('3');
    await field('Armor').fill('110');
    await field('Notes').fill('Jump jets');

    await expect.poll(() => cardField('name')).toBe('Ironclad');
    await expect.poll(() => cardField('class')).toBe('Heavy');
    await expect.poll(() => cardField('bp')).toBe('18');
    await expect.poll(() => cardField('mv')).toBe('4');
    await expect.poll(() => cardField('tp')).toBe('2');
    await expect.poll(() => cardField('hc')).toBe('3');
    await expect.poll(() => cardField('armor')).toBe('110');
    await expect.poll(() => cardField('notes')).toBe('Jump jets');
    await expect.element(page.getByRole('img', { name: 'Ironclad record card' })).toBeVisible();
  });

  it('holds an out-of-range value as a draft, then pulls it into range on blur', async () => {
    await loadWithNewMech();
    await expect.poll(() => cardField('bp')).toBe('1');
    await field('Bp').fill('25');
    await expect.element(field('Bp')).toHaveValue(25);
    // The input renders the draft in the same commit that would have rebuilt the card.
    expect(cardField('bp')).toBe('1');

    await field('Name').click();
    await expect.element(field('Bp')).toHaveValue(20);
    await expect.poll(() => cardField('bp')).toBe('20');
  });

  // One case per rule; `numberRange.test.ts` covers the rest in Node.
  it.each([
    { rule: 'below the min', label: 'Bp', start: '5', typed: '0', settled: 1 },
    { rule: 'above the max', label: 'Tp', start: '5', typed: '12', settled: 9 },
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
    await field('Mv').fill('4');
    await field('Mv').fill('');
    await field('Name').click();
    await expect.element(field('Mv')).toHaveValue(4);
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

    await expect.poll(() => cardField('ra-weapon')).toBe('HL');
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
    await field('Bp').fill('8');
    await picker('Left Arm').selectOptions('Heavy Laser');
    await picker('Right Arm').selectOptions('Heavy Cannon');
    await expect.poll(() => cardField('ra-weapon')).toBe('HC');
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
    await expect.element(unitProfiles().getByText('2 Issues')).toBeInTheDocument();
  });

  it('flags Bp below the Bp of its mounts, until Bp covers them', async () => {
    await loadWithNewMech();
    await picker('Left Arm').selectOptions('Light Cannon');
    await expect
      .element(issues().getByText('Bp 1 is less than the 2 Bp it mounts'))
      .toBeInTheDocument();
    await expect.element(unitProfiles().getByText('1 Issue')).toBeInTheDocument();

    await field('Bp').fill('2');
    await expect.element(issues()).not.toBeInTheDocument();
    await expect.element(unitProfiles().getByText(/Issue/)).not.toBeInTheDocument();
  });

  it('flags Support Equipment on an arm and names missing from the Catalog, even at quantity 0', async () => {
    loadList({
      version: 1,
      name: 'Iron Legion',
      bpLimit: 50,
      unitProfiles: [
        mech({
          id: 'a',
          name: 'Oddball',
          bp: 5,
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
    await expect.element(unitProfiles().getByText('2 Issues')).toBeInTheDocument();

    // Choosing another entry drops the unlisted one from the picker.
    await picker('Right Arm').selectOptions('Light Laser');
    await expect.element(unitProfiles().getByText('1 Issue')).toBeInTheDocument();
    expect(optionTexts('Right Arm')).not.toContain('Plasma Thrower (not in the Catalog)');
  });

  it('marks only the Unit Profiles with Issues in the list', async () => {
    loadList({
      version: 1,
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

    await expect.element(profileRow('Flawed').getByText('2 Issues')).toBeInTheDocument();
    expect(profileRow('Sound').getByText(/Issue/).query()).toBeNull();
    // The first Unit Profile is open, and has none to list.
    await expect.element(field('Name')).toHaveValue('Sound');
    expect(issues().query()).toBeNull();
  });
});

describe('Download PDF', () => {
  it('is unavailable until a Unit Profile is selected', async () => {
    load(fakeStore());
    await expect.element(downloadPdf()).toBeDisabled();
  });

  it("saves the selected Unit Profile's card as a PDF", async () => {
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
    await loadWithNewMech();
    await addMech();
    await addMech();
    // Neither the first nor the last added.
    await openButton('New Mech 2').click();
    await expect.poll(() => cardField('name')).toBe('New Mech 2');

    await downloadPdf().click();
    await vi.waitFor(
      () => expect(links.map(({ download }) => download)).toContain('mech-attack-cards.pdf'),
      { timeout: 10_000 },
    );
    const blob = createObjectURL.mock.calls.at(-1)?.[0] as Blob;
    expect(blob.type).toBe('application/pdf');

    const [cards] = vi.mocked(exportCardsPdf).mock.calls[0] ?? [];
    expect(cards).toHaveLength(1);
    expect(cards?.[0]?.svg.querySelector('[data-field="name"]')?.textContent).toBe('New Mech 2');
    await expect.element(downloadPdf()).toBeEnabled();
    expect(page.getByText(/Couldn't build the PDF/).query()).toBeNull();
  });
});

function mech(profile: Partial<MechProfile> & Pick<MechProfile, 'id' | 'name'>): MechProfile {
  return {
    kind: 'Mech',
    class: 'Light',
    bp: 1,
    mv: 0,
    tp: 0,
    hc: 0,
    armor: 0,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
    ...profile,
  };
}
