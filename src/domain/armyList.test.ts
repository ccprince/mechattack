import { describe, expect, it } from 'vitest';
import { armyListSchema, bpTotal, duplicateNames, isOverBpLimit, type ArmyList } from './armyList';
import type { MechProfile } from './mech';

function mech(overrides: Partial<MechProfile> = {}): MechProfile {
  return {
    kind: 'Mech',
    id: 'u1',
    name: 'Ironclad',
    class: 'Heavy',
    bp: 12,
    mv: 4,
    tp: 2,
    hc: 3,
    armor: 110,
    notes: '',
    hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
    ...overrides,
  };
}

function list(overrides: Partial<ArmyList> = {}): ArmyList {
  return { version: 1, name: 'Iron Legion', bpLimit: 40, unitProfiles: [], ...overrides };
}

describe('armyListSchema', () => {
  it('accepts a valid document', () => {
    const army = list({ unitProfiles: [mech({ id: 'u1' }), mech({ id: 'u2', quantity: 0 })] });
    expect(armyListSchema.parse(army)).toEqual(army);
  });

  it('accepts the edges of every range', () => {
    const low = mech({ id: 'u1', bp: 1, mv: 0, tp: 0, hc: 0, armor: 0, quantity: 0 });
    const high = mech({ id: 'u2', bp: 20, mv: 9, tp: 9, hc: 9, armor: 150 });
    expect(armyListSchema.safeParse(list({ unitProfiles: [low, high] })).success).toBe(true);
  });

  it.each<[string, Partial<MechProfile>]>([
    ['Bp 0', { bp: 0 }],
    ['Bp 21', { bp: 21 }],
    ['fractional Bp', { bp: 2.5 }],
    ['Mv 10', { mv: 10 }],
    ['negative Tp', { tp: -1 }],
    ['Hc 10', { hc: 10 }],
    ['Armor off a step of 10', { armor: 105 }],
    ['Armor 160', { armor: 160 }],
    ['negative Armor', { armor: -10 }],
    ['negative quantity', { quantity: -1 }],
    ['fractional quantity', { quantity: 1.5 }],
  ])('rejects %s', (_, overrides) => {
    expect(armyListSchema.safeParse(list({ unitProfiles: [mech(overrides)] })).success).toBe(false);
  });

  it('rejects an unknown version', () => {
    expect(armyListSchema.safeParse({ ...list(), version: 2 }).success).toBe(false);
  });

  it('rejects two Unit Profiles with the same id', () => {
    const army = list({ unitProfiles: [mech({ id: 'u1' }), mech({ id: 'u1', name: 'Other' })] });
    expect(armyListSchema.safeParse(army).success).toBe(false);
  });
});

describe('bpTotal', () => {
  it('sums each Unit Profile Bp times its quantity', () => {
    const army = list({
      unitProfiles: [
        mech({ id: 'u1', bp: 12, quantity: 2 }),
        mech({ id: 'u2', bp: 5, quantity: 3 }),
        mech({ id: 'u3', bp: 20, quantity: 0 }),
      ],
    });
    expect(bpTotal(army)).toBe(39);
  });

  it('is 0 for an empty Army List', () => {
    expect(bpTotal(list())).toBe(0);
  });
});

describe('isOverBpLimit', () => {
  it('is false at exactly the Bp Limit', () => {
    expect(
      isOverBpLimit(list({ bpLimit: 24, unitProfiles: [mech({ bp: 12, quantity: 2 })] })),
    ).toBe(false);
  });

  it('is true once the Bp total passes the Bp Limit', () => {
    expect(
      isOverBpLimit(list({ bpLimit: 23, unitProfiles: [mech({ bp: 12, quantity: 2 })] })),
    ).toBe(true);
  });
});

describe('duplicateNames', () => {
  it('holds each name two or more Unit Profiles share', () => {
    const army = list({
      unitProfiles: [
        mech({ id: 'u1', name: 'Ironclad' }),
        mech({ id: 'u2', name: 'Scout' }),
        mech({ id: 'u3', name: 'Ironclad', quantity: 0 }),
        mech({ id: 'u4', name: 'Ironclad (copy)' }),
      ],
    });
    expect(duplicateNames(army)).toEqual(new Set(['Ironclad']));
  });

  it('ignores surrounding spaces, and blank names', () => {
    const army = list({
      unitProfiles: [
        mech({ id: 'u1', name: 'Ironclad ' }),
        mech({ id: 'u2', name: 'Ironclad' }),
        mech({ id: 'u3', name: '' }),
        mech({ id: 'u4', name: '  ' }),
      ],
    });
    expect(duplicateNames(army)).toEqual(new Set(['Ironclad']));
  });
});
