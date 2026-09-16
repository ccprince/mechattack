import { describe, expect, it } from 'vitest';
import type { ArmyList } from './armyList';
import { armyListFilename, parseArmyList, serializeArmyList } from './armyListFile';

const ironLegion: ArmyList = {
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
      heatSinks: 1,
      engineUpgrades: 2,
      notes: 'Holds the line',
      hardpoints: { leftArm: 'Heavy Laser', rightArm: null, leftTorso: null, rightTorso: null },
      quantity: 2,
    },
    {
      kind: 'Troop',
      id: 'u2',
      name: 'Skyborne',
      class: 'Jump Infantry',
      crewServedWeapon: 'Light Missile',
      notes: '',
      quantity: 3,
    },
  ],
};

describe('serializeArmyList and parseArmyList', () => {
  it('round-trips an Army List unchanged', () => {
    expect(parseArmyList(serializeArmyList(ironLegion))).toEqual(ironLegion);
  });

  it('writes the versioned document itself, with no wrapper', () => {
    expect(JSON.parse(serializeArmyList(ironLegion))).toEqual(ironLegion);
  });

  it('migrates a version 1 document', () => {
    const version1 = {
      ...ironLegion,
      version: 1,
      unitProfiles: [
        { ...ironLegion.unitProfiles[0], heatSinks: undefined, engineUpgrades: undefined, bp: 12 },
      ],
    };
    expect(parseArmyList(JSON.stringify(version1))).toEqual({
      ...ironLegion,
      unitProfiles: [{ ...ironLegion.unitProfiles[0], heatSinks: 0, engineUpgrades: 0 }],
    });
  });

  it.each([
    ['malformed JSON', '{"version": 2, "name": '],
    ['a document failing the schema', JSON.stringify({ ...ironLegion, bpLimit: -5 })],
    ['JSON that is not an Army List', '[1, 2, 3]'],
  ])('rejects %s', (_, text) => {
    expect(parseArmyList(text)).toBeUndefined();
  });
});

describe('armyListFilename', () => {
  it.each([
    ['Iron Legion', 'iron-legion.json'],
    ['  3rd  Company: "Hellhounds"!  ', '3rd-company-hellhounds.json'],
    ['Légion Étrangère', 'legion-etrangere.json'],
    ['Iron/Legion\\v2', 'iron-legion-v2.json'],
  ])('slugifies %j', (name, filename) => {
    expect(armyListFilename(name)).toBe(filename);
  });

  it.each(['', '   ', '?!/*'])('falls back to army-list.json for %j', (name) => {
    expect(armyListFilename(name)).toBe('army-list.json');
  });
});
