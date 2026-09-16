import { describe, expect, it } from 'vitest';
import type { VehicleProfile } from '../domain/vehicle';
import { vehicleIssues } from '../domain/vehicleRules';
import type { Measure } from './fitText';
import { testVehicle } from './testVehicle';
import { mountRows, vehicleNotes } from './vehicleCardContent';

// Every character is half the font size wide: at 10px, 71 characters fit the 358-wide Notes box.
const measure: Measure = (text, fontSize) => text.length * fontSize * 0.5;

// Catalog Dp of the entries these rows mount.
const lightLaserDp = { rolls: 1, rows: [1, 1, 1] };
const mediumLaserDp = { rolls: 1, rows: [1, 1, 1, 1] };
const lightMgDp = { rolls: 3, rows: [1] };

const rows = (profile: VehicleProfile) => mountRows(profile, vehicleIssues(profile));
const notes = (profile: VehicleProfile) => vehicleNotes(profile, vehicleIssues(profile), measure);

describe('mountRows', () => {
  it('prints the Turret with its label, full name and Rv', () => {
    expect(rows(testVehicle)).toEqual([
      { mount: 'turret', text: 'Turret: Light Laser', rv: '6/10', dp: lightLaserDp, marked: false },
    ]);
  });

  it('prints nothing for a Vehicle with no filled mounts', () => {
    expect(rows({ ...testVehicle, mounts: { ...testVehicle.mounts, turret: null } })).toEqual([]);
  });

  it('fills the rows with only the filled Static Mount slots, leaving Rv blank without range', () => {
    const profile: VehicleProfile = {
      ...testVehicle,
      class: 'Medium',
      turret: false,
      staticMount: true,
      cargoBays: 0,
      mounts: {
        turret: null,
        staticMount1: null,
        staticMount2: 'Remote Guided Missile System',
      },
    };
    expect(rows(profile)).toEqual([
      {
        mount: 'staticMount2',
        text: 'Static: Remote Guided Missile System',
        rv: undefined,
        dp: undefined,
        marked: false,
      },
    ]);
  });

  it('ignores the mount of a Hull Option the Vehicle doesn’t take', () => {
    expect(
      rows({ ...testVehicle, mounts: { ...testVehicle.mounts, staticMount1: 'Light Laser' } }),
    ).toEqual([
      { mount: 'turret', text: 'Turret: Light Laser', rv: '6/10', dp: lightLaserDp, marked: false },
    ]);
  });

  it('drops the mounts past two on an illegal Vehicle, in Turret then Static order', () => {
    const profile: VehicleProfile = {
      ...testVehicle,
      staticMount: true,
      cargoBays: 0,
      mounts: {
        turret: 'Medium Laser',
        staticMount1: 'Light Machine Gun',
        staticMount2: 'Plasma Lance',
      },
    };
    expect(rows(profile)).toEqual([
      {
        mount: 'turret',
        text: 'Turret: Medium Laser',
        rv: '6/10',
        dp: mediumLaserDp,
        marked: true,
      },
      {
        mount: 'staticMount1',
        text: 'Static: Light Machine Gun',
        rv: '8/12',
        dp: lightMgDp,
        marked: false,
      },
    ]);
  });

  it('prints a name missing from the Catalog as stored, marked', () => {
    const profile: VehicleProfile = {
      ...testVehicle,
      mounts: { ...testVehicle.mounts, turret: 'Plasma Lance' },
    };
    expect(rows(profile)).toEqual([
      { mount: 'turret', text: 'Turret: Plasma Lance', rv: undefined, dp: undefined, marked: true },
    ]);
  });
});

describe('vehicleNotes', () => {
  it('prints the notes alone on a Legal Vehicle with no Cargo Bay', () => {
    expect(notes({ ...testVehicle, turret: false, cargoBays: 0, armor: 10 })).toEqual([
      { field: 'notes', lines: ['Amphibious. Smoke launchers (1/game).'], y: 277 },
    ]);
  });

  it('puts the Cargo Bays above the notes', () => {
    expect(notes({ ...testVehicle, cargoBays: 2, turret: false })).toEqual([
      { field: 'cargo-bays', lines: ['Cargo Bay ×2'], y: 277 },
      { field: 'notes', lines: ['Amphibious. Smoke launchers (1/game).'], y: 291 },
    ]);
  });

  it('heads the notes with the ILLEGAL line, then the Cargo Bays', () => {
    const profile: VehicleProfile = { ...testVehicle, cargoBays: 2 };
    expect(notes(profile)).toEqual([
      { field: 'illegal', lines: ['ILLEGAL: Hull Options over'], y: 277 },
      { field: 'cargo-bays', lines: ['Cargo Bay ×2'], y: 291 },
      { field: 'notes', lines: ['Amphibious. Smoke launchers (1/game).'], y: 305 },
    ]);
  });

  it('gives the notes the lines the others leave, of 9', () => {
    const longNotes = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join('\n');
    // One Issue whose wording wraps onto a second line.
    const turret = 'An entry whose name is long enough to wrap onto a second line';
    const [illegal, cargoBays, rest] = notes({
      ...testVehicle,
      notes: longNotes,
      mounts: { ...testVehicle.mounts, turret },
    });
    expect(illegal?.lines).toHaveLength(2);
    expect(cargoBays?.y).toBe(277 + 2 * 14);
    expect(rest?.y).toBe(277 + 3 * 14);
    expect(rest?.lines).toHaveLength(6);
    expect(rest?.lines.at(-1)).toBe('Line 6…');
  });
});
