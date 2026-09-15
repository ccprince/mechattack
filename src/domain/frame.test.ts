import { describe, expect, it } from 'vitest';
import { mechStats } from './frame';
import type { MechProfile } from './mech';

function mech(overrides: Partial<MechProfile> = {}): MechProfile {
  return {
    kind: 'Mech',
    id: 'u1',
    name: 'Ironclad',
    class: 'Light',
    armor: 0,
    heatSinks: 0,
    engineUpgrades: 0,
    notes: '',
    hardpoints: { leftArm: null, rightArm: null, leftTorso: null, rightTorso: null },
    quantity: 1,
    ...overrides,
  };
}

describe('mechStats', () => {
  it.each([
    ['Light', { bp: 0, mv: 5, tp: 5, hc: 4 }],
    ['Medium', { bp: 0, mv: 4, tp: 4, hc: 4 }],
    ['Heavy', { bp: 0, mv: 3, tp: 3, hc: 4 }],
  ] as const)('starts a bare %s Mech at its Frame, costing nothing', (mechClass, stats) => {
    expect(mechStats(mech({ class: mechClass }))).toEqual(stats);
  });

  it('charges 1 Bp per 10 Armor', () => {
    expect(mechStats(mech({ armor: 150 })).bp).toBe(15);
  });

  it('charges 2 Bp per Heat Sink, each adding 1 Hc', () => {
    expect(mechStats(mech({ heatSinks: 3 }))).toMatchObject({ bp: 6, hc: 7 });
  });

  it('adds Mv with the first Engine Upgrade and Tp with the second, for 2 Bp each', () => {
    expect(mechStats(mech({ engineUpgrades: 1 }))).toEqual({ bp: 2, mv: 6, tp: 5, hc: 4 });
    expect(mechStats(mech({ engineUpgrades: 2 }))).toEqual({ bp: 4, mv: 6, tp: 6, hc: 4 });
  });

  it('adds the Bp of every mount, too heavy or not, and nothing for a name missing from the Catalog', () => {
    const hardpoints = {
      leftArm: 'Heavy Laser',
      rightArm: 'Light Cannon',
      leftTorso: 'Improved Weapon Targeting System',
      rightTorso: 'Plasma Lance',
    };
    expect(mechStats(mech({ armor: 30, hardpoints })).bp).toBe(3 + 3 + 2 + 2);
  });

  it('keeps the upgrades and works stats out again from the new Frame after a Class change', () => {
    const heavy = mech({ class: 'Heavy', heatSinks: 3, engineUpgrades: 2 });
    expect(mechStats({ ...heavy, class: 'Light' })).toEqual({ bp: 10, mv: 6, tp: 6, hc: 7 });
  });
});
