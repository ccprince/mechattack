import { describe, expect, it } from 'vitest';
import { illegalNote, troopIllegalNote, vehicleIllegalNote } from './illegalNote';

describe('vehicleIllegalNote', () => {
  it('is absent on a Legal card', () => {
    expect(vehicleIllegalNote([])).toBeUndefined();
  });

  it('reports more Hull Options than the Frame allows', () => {
    expect(
      vehicleIllegalNote([
        { rule: 'overHullOptions', used: 3, vehicleClass: 'Light', hullOptions: 2 },
      ]),
    ).toBe('ILLEGAL: Hull Options over');
  });

  it('names a mount too heavy for the Class by its row label and short name', () => {
    expect(
      vehicleIllegalNote([
        { rule: 'mountTooHeavy', mount: 'turret', name: 'Heavy Laser', entryClass: 'Heavy' },
      ]),
    ).toBe('ILLEGAL: Turret: Hv Laser too heavy');
  });

  it('names a Static Mount entry missing from the Catalog', () => {
    expect(
      vehicleIllegalNote([{ rule: 'notInCatalog', mount: 'staticMount2', name: 'Plasma Lance' }]),
    ).toBe('ILLEGAL: Static: Plasma Lance not in Catalog');
  });

  it('reports Bp over the Frame max and a Vehicle costing no Bp', () => {
    expect(
      vehicleIllegalNote([{ rule: 'overMaxBp', bp: 7, vehicleClass: 'Light', maxBp: 5 }]),
    ).toBe('ILLEGAL: Bp over max');
    expect(vehicleIllegalNote([{ rule: 'noBp' }])).toBe('ILLEGAL: Bp is 0');
  });

  it('counts several Issues', () => {
    expect(vehicleIllegalNote([{ rule: 'noBp' }, { rule: 'noBp' }])).toBe('ILLEGAL: 2 issues');
  });
});

describe('illegalNote', () => {
  it('is absent on a Legal card', () => {
    expect(illegalNote([])).toBeUndefined();
  });

  it('names a mount too heavy for the Class by its short name', () => {
    expect(
      illegalNote([
        { rule: 'mountTooHeavy', hardpoint: 'rightArm', name: 'Heavy Laser', entryClass: 'Heavy' },
      ]),
    ).toBe('ILLEGAL: Hv Laser too heavy');
  });

  it('names Support Equipment on an arm by its short name', () => {
    expect(
      illegalNote([
        {
          rule: 'supportEquipmentOnArm',
          hardpoint: 'leftArm',
          name: 'Electronic Counter Targeting System',
        },
      ]),
    ).toBe('ILLEGAL: ECTS on an arm');
  });

  it('names the Hardpoint of a mount missing from the Catalog', () => {
    expect(
      illegalNote([{ rule: 'notInCatalog', hardpoint: 'leftTorso', name: 'Plasma Lance' }]),
    ).toBe('ILLEGAL: Left Torso not in Catalog');
  });

  it('reports Bp over the Frame max', () => {
    expect(illegalNote([{ rule: 'overMaxBp', bp: 16, mechClass: 'Light', maxBp: 8 }])).toBe(
      'ILLEGAL: Bp over max',
    );
  });

  it('reports a Mech costing no Bp', () => {
    expect(illegalNote([{ rule: 'noBp' }])).toBe('ILLEGAL: Bp is 0');
  });

  it('counts several Issues', () => {
    expect(
      illegalNote([
        { rule: 'notInCatalog', hardpoint: 'leftTorso', name: 'Plasma Lance' },
        { rule: 'noBp' },
      ]),
    ).toBe('ILLEGAL: 2 issues');
  });
});

describe('troopIllegalNote', () => {
  it('is absent on a Legal card', () => {
    expect(troopIllegalNote([])).toBeUndefined();
  });

  it('names a Crew Served Weapon too heavy by its short name', () => {
    expect(
      troopIllegalNote([{ rule: 'mountTooHeavy', name: 'Medium Laser', entryClass: 'Medium' }]),
    ).toBe('ILLEGAL: Md Laser too heavy');
  });

  it('names a Crew Served Weapon missing from the Catalog', () => {
    expect(troopIllegalNote([{ rule: 'notInCatalog', name: 'Plasma Lance' }])).toBe(
      'ILLEGAL: Plasma Lance not in Catalog',
    );
  });

  it('reports Bp over the Troop Class max, and counts several Issues', () => {
    const overMaxBp = {
      rule: 'overMaxBp',
      bp: 5,
      troopClass: 'Light Infantry',
      maxBp: 4,
    } as const;
    expect(troopIllegalNote([overMaxBp])).toBe('ILLEGAL: Bp over max');
    expect(
      troopIllegalNote([
        { rule: 'mountTooHeavy', name: 'Medium Laser', entryClass: 'Medium' },
        overMaxBp,
      ]),
    ).toBe('ILLEGAL: 2 issues');
  });
});
