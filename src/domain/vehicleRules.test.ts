import { describe, expect, it } from 'vitest';
import type { VehicleProfile } from './vehicle';
import { describeVehicleIssue, eligibleVehicleMounts, vehicleIssues } from './vehicleRules';

const names = (entries: readonly { name: string }[]) => entries.map(({ name }) => name);

function vehicle(overrides: Partial<VehicleProfile> = {}): VehicleProfile {
  return {
    kind: 'Vehicle',
    id: 'u1',
    name: 'Hauler',
    class: 'Light',
    armor: 20,
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

describe('vehicleIssues', () => {
  it('finds none on a legal Vehicle', () => {
    expect(
      vehicleIssues(
        vehicle({
          class: 'Medium',
          armor: 0,
          staticMount: true,
          mounts: {
            turret: null,
            staticMount1: 'Medium Laser',
            staticMount2: 'Remote Guided Missile System',
          },
        }),
      ),
    ).toEqual([]);
  });

  it('flags a Static Mount on an Ultra-light Vehicle, which has only 1 Hull Option', () => {
    expect(vehicleIssues(vehicle({ class: 'Ultra-light', staticMount: true }))).toEqual([
      { rule: 'overHullOptions', used: 2, vehicleClass: 'Ultra-light', hullOptions: 1 },
    ]);
  });

  it('accepts exactly the Hull Options the Frame allows, and flags one more', () => {
    expect(vehicleIssues(vehicle({ turret: true, cargoBays: 1 }))).toEqual([]);
    expect(vehicleIssues(vehicle({ armor: 0, turret: true, cargoBays: 2 }))).toEqual([
      { rule: 'overHullOptions', used: 3, vehicleClass: 'Light', hullOptions: 2 },
    ]);
  });

  it('counts an empty Turret or Static Mount against the Hull Options', () => {
    expect(vehicleIssues(vehicle({ turret: true, staticMount: true }))).toContainEqual({
      rule: 'overHullOptions',
      used: 3,
      vehicleClass: 'Light',
      hullOptions: 2,
    });
  });

  it('flags a Medium mount on a Light Vehicle', () => {
    expect(
      vehicleIssues(
        vehicle({
          armor: 0,
          turret: true,
          mounts: { turret: 'Medium Laser', staticMount1: null, staticMount2: null },
        }),
      ),
    ).toEqual([
      { rule: 'mountTooHeavy', mount: 'turret', name: 'Medium Laser', entryClass: 'Medium' },
    ]);
  });

  it('flags a Heavy mount on a Medium Vehicle, naming the Static Mount slot', () => {
    expect(
      vehicleIssues(
        vehicle({
          class: 'Medium',
          armor: 0,
          staticMount: true,
          mounts: { turret: null, staticMount1: 'Light Laser', staticMount2: 'Heavy Laser' },
        }),
      ),
    ).toEqual([
      { rule: 'mountTooHeavy', mount: 'staticMount2', name: 'Heavy Laser', entryClass: 'Heavy' },
    ]);
  });

  it('flags a name missing from the Catalog', () => {
    expect(
      vehicleIssues(
        vehicle({
          staticMount: true,
          mounts: { turret: null, staticMount1: 'Autocannon', staticMount2: null },
        }),
      ),
    ).toEqual([{ rule: 'notInCatalog', mount: 'staticMount1', name: 'Autocannon' }]);
  });

  describe('Bp against the Frame', () => {
    it('accepts a Vehicle costing exactly its Frame max Bp, and flags one more', () => {
      // 30 Armor + 1 Engine Upgrade = 5 Bp.
      expect(vehicleIssues(vehicle({ armor: 30, engineUpgrades: 1 }))).toEqual([]);
      expect(vehicleIssues(vehicle({ armor: 40, engineUpgrades: 1 }))).toEqual([
        { rule: 'overMaxBp', bp: 6, vehicleClass: 'Light', maxBp: 5 },
      ]);
    });

    it('flags a Vehicle costing no Bp, even with an empty Turret', () => {
      expect(vehicleIssues(vehicle({ armor: 0, turret: true }))).toEqual([{ rule: 'noBp' }]);
    });
  });

  it('reports every Issue, mounts first, on a Unit Profile that is not fielded', () => {
    expect(
      vehicleIssues(
        vehicle({
          class: 'Ultra-light',
          armor: 60,
          quantity: 0,
          turret: true,
          staticMount: true,
          mounts: { turret: 'Heavy Cannon', staticMount1: 'Plasma Lance', staticMount2: null },
        }),
      ),
    ).toEqual([
      { rule: 'mountTooHeavy', mount: 'turret', name: 'Heavy Cannon', entryClass: 'Heavy' },
      { rule: 'notInCatalog', mount: 'staticMount1', name: 'Plasma Lance' },
      { rule: 'overHullOptions', used: 3, vehicleClass: 'Ultra-light', hullOptions: 1 },
      { rule: 'overMaxBp', bp: 10, vehicleClass: 'Ultra-light', maxBp: 4 },
    ]);
  });
});

describe('eligibleVehicleMounts', () => {
  it.each(['Ultra-light', 'Light'] as const)(
    'offers a %s Vehicle only Light entries, Support Equipment included',
    (vehicleClass) => {
      const entries = eligibleVehicleMounts(vehicleClass);
      expect(entries.every((entry) => entry.class === 'Light')).toBe(true);
      expect(names(entries)).toContain('Remote Guided Missile System');
    },
  );

  it('offers a Medium Vehicle Light and Medium entries', () => {
    const entries = eligibleVehicleMounts('Medium');
    expect(new Set(entries.map((entry) => entry.class))).toEqual(new Set(['Light', 'Medium']));
    expect(names(entries)).toContain('Improved Weapon Targeting System');
  });
});

describe('describeVehicleIssue', () => {
  it.each([
    [
      { rule: 'mountTooHeavy', mount: 'turret', name: 'Medium Laser', entryClass: 'Medium' },
      "Turret: Medium Laser is Medium, heavier than the Vehicle's Class may mount",
    ],
    [
      { rule: 'notInCatalog', mount: 'staticMount2', name: 'Autocannon' },
      'Static Mount 2: Autocannon is not in the Catalog',
    ],
    [
      { rule: 'overHullOptions', used: 2, vehicleClass: 'Ultra-light', hullOptions: 1 },
      "2 Hull Options is more than an Ultra-light Vehicle's 1",
    ],
    [
      { rule: 'overMaxBp', bp: 7, vehicleClass: 'Light', maxBp: 5 },
      "Bp 7 is more than a Light Vehicle's max Bp of 5",
    ],
    [{ rule: 'noBp' }, 'Bp is 0; a Vehicle must cost at least 1'],
  ] as const)('describes %o', (issue, text) => {
    expect(describeVehicleIssue(issue)).toBe(text);
  });
});
