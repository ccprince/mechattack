import { describe, expect, it } from 'vitest';
import type { TroopProfile } from './troop';
import { describeTroopIssue, eligibleCrewServedWeapons, troopIssues } from './troopRules';

const names = (entries: readonly { name: string }[]) => entries.map(({ name }) => name);

function troop(overrides: Partial<TroopProfile> = {}): TroopProfile {
  return {
    kind: 'Troop',
    id: 'u1',
    name: 'Rifles',
    class: 'Light Infantry',
    crewServedWeapon: null,
    notes: '',
    quantity: 1,
    ...overrides,
  };
}

describe('troopIssues', () => {
  it.each(['Light Infantry', 'Heavy Infantry', 'Jump Infantry'] as const)(
    'finds none on a %s Troop with no Crew Served Weapon',
    (troopClass) => {
      expect(troopIssues(troop({ class: troopClass }))).toEqual([]);
    },
  );

  it('finds none on a Troop with a Light Weapon or Light Support Equipment within its max Bp', () => {
    expect(troopIssues(troop({ crewServedWeapon: 'Light Cannon' }))).toEqual([]);
    expect(
      troopIssues(
        troop({ class: 'Jump Infantry', crewServedWeapon: 'Anti-Missile Defense System' }),
      ),
    ).toEqual([]);
  });

  it('flags a Medium Crew Served Weapon even when the Troop can afford it', () => {
    // 3 Base Bp + 2 Medium Laser = 5, a Heavy Infantry's max Bp.
    expect(
      troopIssues(troop({ class: 'Heavy Infantry', crewServedWeapon: 'Medium Laser' })),
    ).toEqual([{ rule: 'mountTooHeavy', name: 'Medium Laser', entryClass: 'Medium' }]);
  });

  it('reports every Issue, the Crew Served Weapon first, on a Unit Profile that is not fielded', () => {
    expect(
      troopIssues(troop({ class: 'Jump Infantry', crewServedWeapon: 'Heavy Laser', quantity: 0 })),
    ).toEqual([
      { rule: 'mountTooHeavy', name: 'Heavy Laser', entryClass: 'Heavy' },
      { rule: 'overMaxBp', bp: 5 + 3, troopClass: 'Jump Infantry', maxBp: 6 },
    ]);
  });

  it('flags a Crew Served Weapon name missing from the Catalog', () => {
    expect(troopIssues(troop({ crewServedWeapon: 'Autocannon' }))).toEqual([
      { rule: 'notInCatalog', name: 'Autocannon' },
    ]);
  });

  it('flags a Jump Infantry with a 2-Bp Light Weapon as Bp over max, not too heavy', () => {
    expect(
      troopIssues(troop({ class: 'Jump Infantry', crewServedWeapon: 'Light Cannon' })),
    ).toEqual([{ rule: 'overMaxBp', bp: 7, troopClass: 'Jump Infantry', maxBp: 6 }]);
  });

  it('accepts a Troop costing exactly its max Bp', () => {
    expect(
      troopIssues(
        troop({ class: 'Heavy Infantry', crewServedWeapon: 'Light Machine Gun (Twin Linked)' }),
      ),
    ).toEqual([]);
  });
});

describe('eligibleCrewServedWeapons', () => {
  it.each(['Light Infantry', 'Heavy Infantry', 'Jump Infantry'] as const)(
    'offers a %s Troop only Light entries, and never the 3-Bp Light MG-AP',
    (troopClass) => {
      const entries = eligibleCrewServedWeapons(troopClass);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every((entry) => entry.class === 'Light')).toBe(true);
      expect(names(entries)).not.toContain('Light Machine Gun (w/Armor Piercing Ammo)');
    },
  );

  it.each(['Light Infantry', 'Heavy Infantry'] as const)(
    'offers a %s Troop Light entries of up to 2 Bp, Support Equipment included',
    (troopClass) => {
      expect(names(eligibleCrewServedWeapons(troopClass))).toEqual([
        'Light Cannon',
        'Light Laser',
        'Light Laser (Twin Linked)',
        'Light Machine Gun',
        'Light Machine Gun (Twin Linked)',
        'Light Missile',
        'Remote Guided Missile System',
        'Anti-Missile Defense System',
      ]);
    },
  );

  it('offers a Jump Infantry Troop only 1-Bp Light entries', () => {
    const entries = eligibleCrewServedWeapons('Jump Infantry');
    expect(entries.every((entry) => entry.bp === 1)).toBe(true);
    expect(names(entries)).toEqual([
      'Light Laser',
      'Light Machine Gun',
      'Light Missile',
      'Remote Guided Missile System',
      'Anti-Missile Defense System',
    ]);
  });
});

describe('describeTroopIssue', () => {
  it.each([
    [
      { rule: 'mountTooHeavy', name: 'Medium Laser', entryClass: 'Medium' },
      'Crew Served Weapon: Medium Laser is Medium, but a Troop may mount only Light',
    ],
    [
      { rule: 'notInCatalog', name: 'Autocannon' },
      'Crew Served Weapon: Autocannon is not in the Catalog',
    ],
    [
      { rule: 'overMaxBp', bp: 7, troopClass: 'Jump Infantry', maxBp: 6 },
      "Bp 7 is more than a Jump Infantry Troop's max Bp of 6",
    ],
  ] as const)('describes %o', (issue, text) => {
    expect(describeTroopIssue(issue)).toBe(text);
  });
});
