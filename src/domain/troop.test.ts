import { describe, expect, it } from 'vitest';
import { standardEquipment, troopStats, type TroopProfile } from './troop';

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

describe('troopStats', () => {
  it.each([
    ['Light Infantry', { bp: 2, mv: 3, tp: 4, sv: 5 }],
    ['Heavy Infantry', { bp: 3, mv: 3, tp: 4, sv: 10 }],
    ['Jump Infantry', { bp: 5, mv: 4, tp: 4, sv: 10 }],
  ] as const)(
    'gives a %s Troop with no Crew Served Weapon its Class Base Bp and stats',
    (troopClass, stats) => {
      expect(troopStats(troop({ class: troopClass }))).toEqual(stats);
    },
  );

  it.each([
    ['Light Infantry', { bp: 2 + 2, mv: 3, tp: 4, sv: 5 }],
    ['Heavy Infantry', { bp: 3 + 2, mv: 3, tp: 4, sv: 10 }],
    ['Jump Infantry', { bp: 5 + 2, mv: 4, tp: 4, sv: 10 }],
  ] as const)(
    "adds the Crew Served Weapon's Bp on a %s Troop, leaving Mv, Tp and Sv alone",
    (troopClass, stats) => {
      expect(troopStats(troop({ class: troopClass, crewServedWeapon: 'Light Cannon' }))).toEqual(
        stats,
      );
    },
  );

  it('adds the Bp of a Crew Served Weapon too heavy for a Troop', () => {
    expect(troopStats(troop({ crewServedWeapon: 'Heavy Laser' })).bp).toBe(2 + 3);
  });

  it('counts nothing for a name missing from the Catalog', () => {
    expect(troopStats(troop({ crewServedWeapon: 'Plasma Lance' })).bp).toBe(2);
  });
});

describe('standardEquipment', () => {
  it.each([
    ['Light Infantry', ['Individual Weapons']],
    ['Heavy Infantry', ['Individual Weapons']],
    ['Jump Infantry', ['Individual Weapons', 'Jump Packs']],
  ] as const)('gives a %s Troop %o', (troopClass, equipment) => {
    expect(standardEquipment(troopClass)).toEqual(equipment);
  });
});
