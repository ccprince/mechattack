import { describe, expect, it } from 'vitest';
import {
  armyListSchema,
  bpTotal,
  fieldedWithIssues,
  fieldedCopies,
  hasFieldedCopies,
  hasNameClash,
  isOverBpLimit,
  type ArmyList,
} from './armyList';
import type { MechProfile } from './mech';
import type { VehicleProfile } from './vehicle';

function mech(overrides: Partial<MechProfile> = {}): MechProfile {
  return {
    kind: 'Mech',
    id: 'u1',
    name: 'Ironclad',
    class: 'Heavy',
    armor: 90,
    heatSinks: 0,
    engineUpgrades: 0,
    notes: '',
    hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
    ...overrides,
  };
}

function vehicle(overrides: Partial<VehicleProfile> = {}): VehicleProfile {
  return {
    kind: 'Vehicle',
    id: 'v1',
    name: 'Hauler',
    class: 'Medium',
    armor: 20,
    engineUpgrades: 0,
    turret: true,
    staticMount: false,
    cargoBays: 1,
    notes: '',
    mounts: { turret: 'Medium Laser', staticMount1: null, staticMount2: null },
    quantity: 1,
    ...overrides,
  };
}

const noMounts = { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null };

function list(overrides: Partial<ArmyList> = {}): ArmyList {
  return { version: 2, name: 'Iron Legion', bpLimit: 40, unitProfiles: [], ...overrides };
}

describe('armyListSchema', () => {
  it('accepts a valid document', () => {
    const army = list({ unitProfiles: [mech({ id: 'u1' }), mech({ id: 'u2', quantity: 0 })] });
    expect(armyListSchema.parse(army)).toEqual(army);
  });

  it('accepts the edges of every range', () => {
    const low = mech({ id: 'u1', armor: 0, heatSinks: 0, engineUpgrades: 0, quantity: 0 });
    const high = mech({ id: 'u2', armor: 150, heatSinks: 10, engineUpgrades: 2, quantity: 100 });
    expect(armyListSchema.safeParse(list({ unitProfiles: [low, high] })).success).toBe(true);
  });

  it.each<[string, Partial<MechProfile>]>([
    ['negative Heat Sinks', { heatSinks: -1 }],
    ['11 Heat Sinks', { heatSinks: 11 }],
    ['3 Engine Upgrades', { engineUpgrades: 3 }],
    ['fractional Engine Upgrades', { engineUpgrades: 1.5 }],
    ['Armor off a step of 10', { armor: 105 }],
    ['Armor 160', { armor: 160 }],
    ['negative Armor', { armor: -10 }],
    ['negative quantity', { quantity: -1 }],
    ['fractional quantity', { quantity: 1.5 }],
    ['quantity 101', { quantity: 101 }],
  ])('rejects %s', (_, overrides) => {
    expect(armyListSchema.safeParse(list({ unitProfiles: [mech(overrides)] })).success).toBe(false);
  });

  it('accepts Mechs and Vehicles together, and the edges of every Vehicle range', () => {
    const low = vehicle({ id: 'v1', armor: 0, engineUpgrades: 0, cargoBays: 0, quantity: 0 });
    const high = vehicle({ id: 'v2', armor: 60, engineUpgrades: 2, cargoBays: 2, quantity: 100 });
    const army = list({ unitProfiles: [mech(), low, high] });
    expect(armyListSchema.parse(army)).toEqual(army);
  });

  it.each<[string, Partial<VehicleProfile>]>([
    ['Armor 70', { armor: 70 }],
    ['Armor off a step of 10', { armor: 15 }],
    ['3 Engine Upgrades', { engineUpgrades: 3 }],
    ['3 Cargo Bays', { cargoBays: 3 }],
    ['negative Cargo Bays', { cargoBays: -1 }],
    ['a Mech Class', { class: 'Heavy' as never }],
    ['a mount in a Turret it does not take', { turret: false }],
    [
      'a mount in a Static Mount it does not take',
      { mounts: { turret: null, staticMount1: null, staticMount2: 'Light Laser' } },
    ],
  ])('rejects a Vehicle with %s', (_, overrides) => {
    expect(armyListSchema.safeParse(list({ unitProfiles: [vehicle(overrides)] })).success).toBe(
      false,
    );
  });

  it('rejects an unknown kind of unit', () => {
    const troop = { ...mech(), kind: 'Troop' };
    expect(armyListSchema.safeParse(list({ unitProfiles: [troop as never] })).success).toBe(false);
  });

  it('rejects an unknown version', () => {
    expect(armyListSchema.safeParse({ ...list(), version: 3 }).success).toBe(false);
  });

  it('drops typed-in stats, which are worked out instead', () => {
    const typed = { ...mech(), bp: 12, mv: 4, tp: 2, hc: 3 };
    expect(armyListSchema.parse(list({ unitProfiles: [typed] })).unitProfiles[0]).toEqual(mech());
  });

  it('rejects two Unit Profiles with the same id', () => {
    const army = list({ unitProfiles: [mech({ id: 'u1' }), mech({ id: 'u1', name: 'Other' })] });
    expect(armyListSchema.safeParse(army).success).toBe(false);
  });
});

describe('bpTotal', () => {
  it('sums each Unit Profile Bp times its quantity', () => {
    // The default Mech costs 9 Armor + 3 Heavy Laser = 12 Bp.
    const army = list({
      unitProfiles: [
        mech({ id: 'u1', quantity: 2 }),
        mech({ id: 'u2', armor: 50, hardpoints: noMounts, quantity: 3 }),
        mech({ id: 'u3', armor: 150, quantity: 0 }),
      ],
    });
    expect(bpTotal(army)).toBe(39);
  });

  it('adds Vehicles and Mechs alike', () => {
    // The default Vehicle costs 2 Armor + 1 Cargo Bay + 2 Medium Laser = 5 Bp.
    const army = list({ unitProfiles: [mech(), vehicle({ quantity: 2 })] });
    expect(bpTotal(army)).toBe(12 + 10);
  });

  it('is 0 for an empty Army List', () => {
    expect(bpTotal(list())).toBe(0);
  });
});

describe('isOverBpLimit', () => {
  it('is false at exactly the Bp Limit', () => {
    expect(isOverBpLimit(list({ bpLimit: 24, unitProfiles: [mech({ quantity: 2 })] }))).toBe(false);
  });

  it('is true once the Bp total passes the Bp Limit', () => {
    expect(isOverBpLimit(list({ bpLimit: 23, unitProfiles: [mech({ quantity: 2 })] }))).toBe(true);
  });
});

describe('fieldedCopies', () => {
  it('repeats each Unit Profile once per copy fielded, in list order, skipping quantity 0', () => {
    const pair = mech({ id: 'u1', name: 'Pair', quantity: 2 });
    const reserve = mech({ id: 'u2', name: 'Reserve', quantity: 0 });
    const scout = mech({ id: 'u3', name: 'Scout', quantity: 1 });
    const army = list({ unitProfiles: [pair, reserve, scout] });
    expect(fieldedCopies(army)).toEqual([pair, pair, scout]);
  });

  it('includes Vehicles with Mechs', () => {
    const ironclad = mech({ id: 'u1' });
    const hauler = vehicle({ id: 'u2', quantity: 2 });
    expect(fieldedCopies(list({ unitProfiles: [hauler, ironclad] }))).toEqual([
      hauler,
      hauler,
      ironclad,
    ]);
  });

  it('is empty when nothing is fielded', () => {
    expect(fieldedCopies(list({ unitProfiles: [mech({ quantity: 0 })] }))).toEqual([]);
  });
});

describe('hasFieldedCopies', () => {
  it('is true once any Unit Profile has a quantity above 0', () => {
    const reserve = mech({ id: 'u1', quantity: 0 });
    expect(hasFieldedCopies(list())).toBe(false);
    expect(hasFieldedCopies(list({ unitProfiles: [reserve] }))).toBe(false);
    expect(hasFieldedCopies(list({ unitProfiles: [reserve, mech({ id: 'u2' })] }))).toBe(true);
  });
});

describe('hasNameClash', () => {
  it('is true for each Unit Profile whose name another one shares, fielded or not', () => {
    const ironclad = mech({ id: 'u1', name: 'Ironclad' });
    const reserve = mech({ id: 'u2', name: 'Ironclad', quantity: 0 });
    const scout = mech({ id: 'u3', name: 'Scout' });
    const copy = mech({ id: 'u4', name: 'Ironclad (copy)' });
    const army = list({ unitProfiles: [ironclad, scout, reserve, copy] });
    expect([ironclad, scout, reserve, copy].map((profile) => hasNameClash(army, profile))).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it('compares a Vehicle with a Mech', () => {
    const hauler = vehicle({ id: 'u2', name: 'Ironclad' });
    const army = list({ unitProfiles: [mech({ id: 'u1' }), hauler] });
    expect(hasNameClash(army, hauler)).toBe(true);
  });

  it('ignores surrounding spaces', () => {
    const spaced = mech({ id: 'u1', name: ' Ironclad ' });
    const army = list({ unitProfiles: [spaced, mech({ id: 'u2', name: 'Ironclad' })] });
    expect(hasNameClash(army, spaced)).toBe(true);
  });

  it('is false for blank names', () => {
    const blank = mech({ id: 'u1', name: '' });
    const army = list({ unitProfiles: [blank, mech({ id: 'u2', name: '  ' })] });
    expect(hasNameClash(army, blank)).toBe(false);
  });
});

describe('fieldedWithIssues', () => {
  it('lists the fielded Unit Profiles that have Issues, in list order', () => {
    const army = list({
      unitProfiles: [
        mech({ id: 'a', name: 'Sound' }),
        mech({ id: 'b', name: 'Bare', armor: 0, hardpoints: noMounts }),
        mech({ id: 'c', name: 'Shelved', armor: 0, hardpoints: noMounts, quantity: 0 }),
        mech({ id: 'd', name: 'Overloaded', class: 'Light', quantity: 3 }),
      ],
    });
    expect(fieldedWithIssues(army).map(({ name }) => name)).toEqual(['Bare', 'Overloaded']);
  });

  it('includes Vehicles with Issues', () => {
    const army = list({
      unitProfiles: [vehicle({ id: 'a', name: 'Sound' }), vehicle({ id: 'b', class: 'Light' })],
    });
    expect(fieldedWithIssues(army).map(({ id }) => id)).toEqual(['b']);
  });
});
