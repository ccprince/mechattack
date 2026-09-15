import { describe, expect, it } from 'vitest';
import { hullOptionsUsed, mechStats, vehicleStats } from './frame';
import type { MechProfile } from './mech';
import type { VehicleProfile } from './vehicle';

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

function vehicle(overrides: Partial<VehicleProfile> = {}): VehicleProfile {
  return {
    kind: 'Vehicle',
    id: 'u1',
    name: 'Hauler',
    class: 'Light',
    armor: 0,
    engineUpgrades: 0,
    turret: false,
    staticMount: false,
    cargoBays: 0,
    notes: '',
    mounts: { turret: null, staticMount1: null, staticMount2: null },
    quantity: 1,
    ...overrides,
  };
}

describe('vehicleStats', () => {
  it.each([
    ['Ultra-light', { bp: 0, mv: 5, tp: 5 }],
    ['Light', { bp: 0, mv: 4, tp: 4 }],
    ['Medium', { bp: 0, mv: 3, tp: 4 }],
  ] as const)('starts a bare %s Vehicle at its Frame, costing nothing', (vehicleClass, stats) => {
    expect(vehicleStats(vehicle({ class: vehicleClass }))).toEqual(stats);
  });

  it('charges 1 Bp per 10 Armor and 1 Bp per Cargo Bay', () => {
    expect(vehicleStats(vehicle({ armor: 60, cargoBays: 2 })).bp).toBe(8);
  });

  it.each([
    ['Ultra-light', { bp: 2, mv: 6, tp: 5 }, { bp: 4, mv: 6, tp: 6 }],
    ['Light', { bp: 2, mv: 5, tp: 4 }, { bp: 4, mv: 5, tp: 5 }],
    ['Medium', { bp: 2, mv: 4, tp: 4 }, { bp: 4, mv: 4, tp: 5 }],
  ] as const)(
    'adds Mv with the first Engine Upgrade and Tp with the second on a %s Vehicle, for 2 Bp each',
    (vehicleClass, one, two) => {
      expect(vehicleStats(vehicle({ class: vehicleClass, engineUpgrades: 1 }))).toEqual(one);
      expect(vehicleStats(vehicle({ class: vehicleClass, engineUpgrades: 2 }))).toEqual(two);
    },
  );

  it('adds the Bp of every mount, too heavy or not, but nothing for the Turret or Static Mount themselves', () => {
    const mounts = { turret: 'Heavy Laser', staticMount1: 'Light Cannon', staticMount2: null };
    expect(vehicleStats(vehicle({ turret: true, staticMount: true })).bp).toBe(0);
    expect(vehicleStats(vehicle({ turret: true, staticMount: true, mounts })).bp).toBe(3 + 2);
  });

  it('counts nothing for a name missing from the Catalog, or a mount whose Hull Option is not taken', () => {
    const mounts = { turret: 'Plasma Lance', staticMount1: 'Light Cannon', staticMount2: null };
    expect(vehicleStats(vehicle({ turret: true, mounts })).bp).toBe(0);
  });
});

describe('hullOptionsUsed', () => {
  it.each([
    [{}, 0],
    [{ turret: true }, 1],
    [{ staticMount: true }, 2],
    [{ cargoBays: 2 }, 2],
    [{ turret: true, staticMount: true, cargoBays: 2 }, 5],
  ] as const)('counts %o as %i', (overrides, used) => {
    expect(hullOptionsUsed(vehicle(overrides))).toBe(used);
  });

  it.each(['Ultra-light', 'Light', 'Medium'] as const)(
    'counts the same on a %s Vehicle, whatever its Frame allows',
    (vehicleClass) => {
      expect(
        hullOptionsUsed(vehicle({ class: vehicleClass, staticMount: true, cargoBays: 1 })),
      ).toBe(3);
    },
  );
});
