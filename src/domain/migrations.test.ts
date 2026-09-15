import { describe, expect, it } from 'vitest';
import { armyListSchema } from './armyList';
import { migrateArmyList } from './migrations';

describe('migrateArmyList', () => {
  it('drops typed-in Bp, Mv, Tp and Hc from a version 1 list and starts every upgrade at 0', () => {
    const version1 = {
      version: 1,
      name: 'Iron Legion',
      bpLimit: 40,
      unitProfiles: [
        {
          kind: 'Mech',
          id: 'u1',
          name: 'Ironclad',
          class: 'Heavy',
          bp: 12,
          mv: 4,
          tp: 2,
          hc: 3,
          armor: 110,
          notes: 'Holds the line',
          hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
          quantity: 2,
        },
      ],
    };

    const migrated = migrateArmyList(version1);
    expect(migrated).toEqual({
      version: 2,
      name: 'Iron Legion',
      bpLimit: 40,
      unitProfiles: [
        {
          kind: 'Mech',
          id: 'u1',
          name: 'Ironclad',
          class: 'Heavy',
          armor: 110,
          heatSinks: 0,
          engineUpgrades: 0,
          notes: 'Holds the line',
          hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
          quantity: 2,
        },
      ],
    });
    expect(armyListSchema.safeParse(migrated).success).toBe(true);
  });

  it.each([
    ['a current list', { version: 2, name: 'L', bpLimit: 0, unitProfiles: [] }],
    ['an unknown version', { version: 99 }],
    ['something other than an object', 'Iron Legion'],
    ['null', null],
  ])('passes %s through for the schema to judge', (_, document) => {
    expect(migrateArmyList(document)).toBe(document);
  });

  it('passes malformed Unit Profiles through, for the schema to reject', () => {
    expect(migrateArmyList({ version: 1, unitProfiles: 'none' })).toEqual({
      version: 2,
      unitProfiles: 'none',
    });
    expect(migrateArmyList({ version: 1, unitProfiles: [7] })).toEqual({
      version: 2,
      unitProfiles: [7],
    });
  });
});
