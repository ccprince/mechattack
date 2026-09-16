import { describe, expect, it } from 'vitest';
import type { TroopProfile } from '../domain/troop';
import { troopIssues } from '../domain/troopRules';
import type { Measure } from './fitText';
import { testTroop } from './testTroop';
import { crewServedWeaponRow, troopNotes } from './troopCardContent';

// Every character is half the font size wide: at 10px, 46 characters fit the 230-wide Notes box.
const measure: Measure = (text, fontSize) => text.length * fontSize * 0.5;

const row = (profile: TroopProfile) => crewServedWeaponRow(profile, troopIssues(profile));
const notes = (profile: TroopProfile) => troopNotes(profile, troopIssues(profile), measure);

describe('crewServedWeaponRow', () => {
  it('prints the short name and Rv', () => {
    expect(row(testTroop)).toEqual({
      text: 'Lt Missile',
      rv: '3-10/14',
      dp: { rolls: 1, rows: [3] },
      marked: false,
    });
  });

  it('prints nothing without a Crew Served Weapon', () => {
    expect(row({ ...testTroop, crewServedWeapon: null })).toBeUndefined();
  });

  it('leaves Rv blank for Support Equipment with no range', () => {
    expect(row({ ...testTroop, crewServedWeapon: 'Anti-Missile Defense System' })).toEqual({
      text: 'AMDS',
      rv: undefined,
      dp: undefined,
      marked: false,
    });
  });

  it('marks a Crew Served Weapon too heavy', () => {
    expect(row({ ...testTroop, class: 'Jump Infantry', crewServedWeapon: 'Medium Laser' })).toEqual(
      { text: 'Md Laser', rv: '6/10', dp: { rolls: 1, rows: [1, 1, 1, 1] }, marked: true },
    );
  });

  it('prints a name missing from the Catalog as stored, marked, with a blank Rv', () => {
    expect(row({ ...testTroop, crewServedWeapon: 'Plasma Lance' })).toEqual({
      text: 'Plasma Lance',
      rv: undefined,
      dp: undefined,
      marked: true,
    });
  });

  it("doesn't mark the row for Bp over max alone", () => {
    const overMax: TroopProfile = {
      ...testTroop,
      class: 'Jump Infantry',
      crewServedWeapon: 'Light Cannon',
    };
    expect(troopIssues(overMax).map(({ rule }) => rule)).toEqual(['overMaxBp']);
    expect(row(overMax)?.marked).toBe(false);
  });
});

describe('troopNotes', () => {
  it('prints the Standard Equipment, then the notes, on a Legal Troop', () => {
    expect(notes(testTroop)).toEqual([
      { field: 'standard-equipment', lines: ['Individual Weapons'], y: 143 },
      { field: 'notes', lines: ['Holds the ridge.'], y: 156 },
    ]);
  });

  it('adds Jump Packs to the Standard Equipment of Jump Infantry', () => {
    expect(notes({ ...testTroop, class: 'Jump Infantry' })[0]).toEqual({
      field: 'standard-equipment',
      lines: ['Individual Weapons, Jump Packs'],
      y: 143,
    });
  });

  it('cuts long notes off with "…" in the line left', () => {
    const long = { ...testTroop, notes: 'Dug in on the ridge line. '.repeat(4) };
    const [, notesBlock] = notes(long);
    expect(notesBlock?.lines).toHaveLength(1);
    expect(notesBlock?.lines[0]).toMatch(/…$/);
    expect(notesBlock?.lines[0]!.length).toBeLessThanOrEqual(46);
  });

  it('heads an illegal Troop with one ILLEGAL line, leaving no line for notes', () => {
    const illegal: TroopProfile = {
      ...testTroop,
      class: 'Jump Infantry',
      crewServedWeapon: 'Medium Laser',
      notes: 'Never printed.',
    };
    expect(notes(illegal)).toEqual([
      { field: 'illegal', lines: ['ILLEGAL: 2 issues'], y: 143 },
      { field: 'standard-equipment', lines: ['Individual Weapons, Jump Packs'], y: 156 },
    ]);
  });

  it('caps a long ILLEGAL line at one line', () => {
    const [illegal] = notes({
      ...testTroop,
      crewServedWeapon: 'Heavy Particle Projection Cannon of the Old Empire',
    });
    expect(illegal?.field).toBe('illegal');
    expect(illegal?.lines).toHaveLength(1);
    expect(illegal?.lines[0]).toMatch(/^ILLEGAL: Heavy .*…$/);
  });
});
