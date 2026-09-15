import { describe, expect, it } from 'vitest';
import { armyListReducer } from './armyListReducer';
import type { MechProfile } from './mech';
import { describeIssue, eligibleMounts, unitProfileIssues } from './mechRules';

const names = (entries: readonly { name: string }[]) => entries.map(({ name }) => name);

function mech(overrides: Partial<MechProfile> = {}): MechProfile {
  return {
    kind: 'Mech',
    id: 'u1',
    name: 'Ironclad',
    class: 'Heavy',
    bp: 20,
    mv: 3,
    tp: 4,
    hc: 5,
    armor: 100,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
    ...overrides,
  };
}

describe('unitProfileIssues', () => {
  it('finds none on a legal Mech', () => {
    expect(
      unitProfileIssues(
        mech({
          bp: 10,
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
      hardpoints: {
        leftArm: 'Heavy Laser',
        rightArm: 'Light Cannon',
        leftTorso: 'Heavy Missile',
        rightTorso: 'Electronic Counter Targeting System',
      },
    });
    const state = { list: { version: 1 as const, name: 'L', bpLimit: 50, unitProfiles: [heavy] } };
    const light = armyListReducer(
      { ...state, selectedId: null },
      { type: 'updateUnitProfile', id: heavy.id, changes: { class: 'Light' } },
    ).list.unitProfiles[0]!;

    expect(light.hardpoints).toEqual(heavy.hardpoints);
    expect(unitProfileIssues(light)).toEqual([
      { rule: 'mountTooHeavy', hardpoint: 'leftArm', name: 'Heavy Laser', entryClass: 'Heavy' },
      { rule: 'mountTooHeavy', hardpoint: 'leftTorso', name: 'Heavy Missile', entryClass: 'Heavy' },
      {
        rule: 'mountTooHeavy',
        hardpoint: 'rightTorso',
        name: 'Electronic Counter Targeting System',
        entryClass: 'Heavy',
      },
    ]);
  });

  it('flags Support Equipment on an arm', () => {
    expect(
      unitProfileIssues(
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
      unitProfileIssues(
        mech({
          hardpoints: { leftArm: null, rightArm: 'Autocannon', leftTorso: null, rightTorso: null },
        }),
      ),
    ).toEqual([{ rule: 'notInCatalog', hardpoint: 'rightArm', name: 'Autocannon' }]);
  });

  describe('Bp below its mounts', () => {
    // Heavy Cannon 4 + Heavy Laser 3 twice = 10 Bp, plus an unknown name that costs nothing known.
    const hardpoints = {
      leftArm: 'Heavy Laser',
      rightArm: 'Heavy Laser',
      leftTorso: 'Heavy Cannon',
      rightTorso: 'Autocannon',
    };

    it('flags a unit costing less Bp than what it mounts', () => {
      expect(unitProfileIssues(mech({ bp: 9, hardpoints }))).toContainEqual({
        rule: 'bpBelowMounts',
        bp: 9,
        mountsBp: 10,
      });
    });

    it('accepts a unit costing exactly what it mounts, a lower bound only', () => {
      expect(unitProfileIssues(mech({ bp: 10, hardpoints }))).toEqual([
        { rule: 'notInCatalog', hardpoint: 'rightTorso', name: 'Autocannon' },
      ]);
    });

    it('counts a too-heavy mount, which the Mech still carries', () => {
      const issues = unitProfileIssues(mech({ class: 'Light', bp: 1, hardpoints }));
      expect(issues).toContainEqual({ rule: 'bpBelowMounts', bp: 1, mountsBp: 10 });
    });
  });

  it('reports Issues on a Unit Profile that is not fielded', () => {
    const issues = unitProfileIssues(
      mech({
        quantity: 0,
        bp: 1,
        hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
      }),
    );
    expect(issues).toEqual([{ rule: 'bpBelowMounts', bp: 1, mountsBp: 3 }]);
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

describe('describeIssue', () => {
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
    [{ rule: 'bpBelowMounts', bp: 9, mountsBp: 10 }, 'Bp 9 is less than the 10 Bp it mounts'],
  ] as const)('describes %o', (issue, text) => {
    expect(describeIssue(issue)).toBe(text);
  });
});
