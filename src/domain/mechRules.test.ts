import { describe, expect, it } from 'vitest';
import { armyListReducer } from './armyListReducer';
import type { MechProfile } from './mech';
import { describeMechIssue, eligibleMounts, mechIssues } from './mechRules';

const names = (entries: readonly { name: string }[]) => entries.map(({ name }) => name);

function mech(overrides: Partial<MechProfile> = {}): MechProfile {
  return {
    kind: 'Mech',
    id: 'u1',
    name: 'Ironclad',
    class: 'Heavy',
    armor: 100,
    heatSinks: 0,
    engineUpgrades: 0,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
    ...overrides,
  };
}

describe('mechIssues', () => {
  it('finds none on a legal Mech', () => {
    expect(
      mechIssues(
        mech({
          hardpoints: {
            leftArm: 'Heavy Laser',
            rightArm: 'Medium Cannon',
            leftTorso: 'Electronic Counter Targeting System',
            rightTorso: null,
          },
        }),
      ),
    ).toEqual([]);
  });

  it('flags every Heavy mount, and keeps them, when a Heavy Mech changes to Light', () => {
    const heavy = mech({
      armor: 0,
      hardpoints: {
        leftArm: 'Heavy Laser',
        rightArm: 'Light Cannon',
        leftTorso: 'Heavy Missile',
        rightTorso: 'Electronic Counter Targeting System',
      },
    });
    const state = { list: { version: 2 as const, name: 'L', bpLimit: 50, unitProfiles: [heavy] } };
    const light = armyListReducer(
      { ...state, selectedId: null },
      { type: 'updateUnitProfile', id: heavy.id, changes: { class: 'Light' } },
    ).list.unitProfiles[0] as MechProfile;

    expect(light.hardpoints).toEqual(heavy.hardpoints);
    expect(mechIssues(light)).toEqual([
      { rule: 'mountTooHeavy', hardpoint: 'leftArm', name: 'Heavy Laser', entryClass: 'Heavy' },
      { rule: 'mountTooHeavy', hardpoint: 'leftTorso', name: 'Heavy Missile', entryClass: 'Heavy' },
      {
        rule: 'mountTooHeavy',
        hardpoint: 'rightTorso',
        name: 'Electronic Counter Targeting System',
        entryClass: 'Heavy',
      },
      { rule: 'overMaxBp', bp: 11, mechClass: 'Light', maxBp: 8 },
    ]);
  });

  it('flags Support Equipment on an arm', () => {
    expect(
      mechIssues(
        mech({
          hardpoints: {
            leftArm: 'Anti-Missile Defense System',
            rightArm: 'Light Laser',
            leftTorso: 'Remote Guided Missile System',
            rightTorso: null,
          },
        }),
      ),
    ).toEqual([
      { rule: 'supportEquipmentOnArm', hardpoint: 'leftArm', name: 'Anti-Missile Defense System' },
    ]);
  });

  it('flags a name missing from the Catalog', () => {
    expect(
      mechIssues(
        mech({
          hardpoints: { leftArm: null, rightArm: 'Autocannon', leftTorso: null, rightTorso: null },
        }),
      ),
    ).toEqual([{ rule: 'notInCatalog', hardpoint: 'rightArm', name: 'Autocannon' }]);
  });

  describe('Bp against the Frame', () => {
    // Heavy Cannon 4 + Heavy Laser 3 twice = 10 Bp, plus an unknown name that costs nothing known.
    const hardpoints = {
      leftArm: 'Heavy Laser',
      rightArm: 'Heavy Laser',
      leftTorso: 'Heavy Cannon',
      rightTorso: 'Autocannon',
    };

    it('accepts a Mech costing exactly its Frame max Bp', () => {
      // 60 Armor + 2 Heat Sinks = 10 Bp, with 10 Bp of mounts.
      expect(mechIssues(mech({ armor: 60, heatSinks: 2, hardpoints }))).toEqual([
        { rule: 'notInCatalog', hardpoint: 'rightTorso', name: 'Autocannon' },
      ]);
    });

    it('flags a Mech costing more than its Frame max Bp', () => {
      expect(mechIssues(mech({ armor: 70, heatSinks: 2, hardpoints }))).toContainEqual({
        rule: 'overMaxBp',
        bp: 21,
        mechClass: 'Heavy',
        maxBp: 20,
      });
    });

    it('counts a too-heavy mount, which the Mech still carries', () => {
      const issues = mechIssues(mech({ class: 'Light', armor: 0, hardpoints }));
      expect(issues).toContainEqual({ rule: 'overMaxBp', bp: 10, mechClass: 'Light', maxBp: 8 });
    });

    it('flags a Mech costing no Bp, but not one costing 1', () => {
      expect(mechIssues(mech({ class: 'Light', armor: 0 }))).toEqual([{ rule: 'noBp' }]);
      expect(mechIssues(mech({ class: 'Light', armor: 10 }))).toEqual([]);
    });
  });

  it('reports Issues on a Unit Profile that is not fielded', () => {
    expect(mechIssues(mech({ quantity: 0, armor: 0 }))).toEqual([{ rule: 'noBp' }]);
  });
});

describe('eligibleMounts', () => {
  it('offers a Light Mech arm only Light Weapons', () => {
    expect(names(eligibleMounts('Light', 'leftArm'))).toEqual([
      'Light Cannon',
      'Light Laser',
      'Light Laser (Twin Linked)',
      'Light Machine Gun',
      'Light Machine Gun (Twin Linked)',
      'Light Machine Gun (w/Armor Piercing Ammo)',
      'Light Missile',
    ]);
  });

  it('offers a Medium Mech torso Light and Medium entries, Support Equipment included', () => {
    expect(names(eligibleMounts('Medium', 'rightTorso'))).toEqual([
      'Light Cannon',
      'Light Laser',
      'Light Laser (Twin Linked)',
      'Light Machine Gun',
      'Light Machine Gun (Twin Linked)',
      'Light Machine Gun (w/Armor Piercing Ammo)',
      'Light Missile',
      'Remote Guided Missile System',
      'Anti-Missile Defense System',
      'Medium Cannon',
      'Medium Laser',
      'Medium Laser (Twin Linked)',
      'Medium Machine Gun',
      'Medium Machine Gun (Twin Linked)',
      'Medium Machine Gun (w/Armor Piercing Ammo)',
      'Medium Missile',
      'Improved Weapon Targeting System',
    ]);
  });

  it('offers a Heavy Mech every entry on a torso, and every Weapon on an arm', () => {
    expect(eligibleMounts('Heavy', 'leftTorso')).toHaveLength(25);
    const arm = eligibleMounts('Heavy', 'rightArm');
    expect(arm).toHaveLength(21);
    expect(arm.every((entry) => entry.kind === 'Weapon')).toBe(true);
  });
});

describe('describeMechIssue', () => {
  it.each([
    [
      { rule: 'mountTooHeavy', hardpoint: 'leftArm', name: 'Heavy Laser', entryClass: 'Heavy' },
      "Left Arm: Heavy Laser is Heavy, heavier than the Mech's Class",
    ],
    [
      { rule: 'supportEquipmentOnArm', hardpoint: 'rightArm', name: 'Anti-Missile Defense System' },
      'Right Arm: Anti-Missile Defense System is Support Equipment, which only fits a torso Hardpoint',
    ],
    [
      { rule: 'notInCatalog', hardpoint: 'leftTorso', name: 'Autocannon' },
      'Left Torso: Autocannon is not in the Catalog',
    ],
    [
      { rule: 'overMaxBp', bp: 16, mechClass: 'Light', maxBp: 8 },
      "Bp 16 is more than a Light Mech's max Bp of 8",
    ],
    [{ rule: 'noBp' }, 'Bp is 0; a Mech must cost at least 1'],
  ] as const)('describes %o', (issue, text) => {
    expect(describeMechIssue(issue)).toBe(text);
  });
});
