import { describe, expect, it } from 'vitest';
import { illegalNote } from './illegalNote';

describe('illegalNote', () => {
  it('is absent on a Legal card', () => {
    expect(illegalNote([])).toBeUndefined();
  });

  it('names a mount too heavy for the Class by its short name', () => {
    expect(
      illegalNote([
        { rule: 'mountTooHeavy', hardpoint: 'rightArm', name: 'Heavy Laser', entryClass: 'Heavy' },
      ]),
    ).toBe('ILLEGAL: HL too heavy');
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

  it('reports Bp below the mounts', () => {
    expect(illegalNote([{ rule: 'bpBelowMounts', bp: 2, mountsBp: 6 }])).toBe(
      'ILLEGAL: Bp below mounts',
    );
  });

  it('counts several Issues', () => {
    expect(
      illegalNote([
        { rule: 'notInCatalog', hardpoint: 'leftTorso', name: 'Plasma Lance' },
        { rule: 'bpBelowMounts', bp: 2, mountsBp: 6 },
      ]),
    ).toBe('ILLEGAL: 2 issues');
  });
});
