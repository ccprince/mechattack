import { describe, expect, it } from 'vitest';
import { armyListReducer } from './armyListReducer';
import { describeUnitProfileIssues, type UnitProfile } from './unitProfile';
import type { VehicleProfile } from './vehicle';

/** A new Unit Profile of that kind, as Add Mech or Add Vehicle makes it. */
function added(type: 'addMech' | 'addVehicle'): UnitProfile {
  const state = armyListReducer(
    { list: { version: 2, name: 'Test', bpLimit: 50, unitProfiles: [] }, selectedId: null },
    { type },
  );
  return state.list.unitProfiles[0]!;
}

describe('describeUnitProfileIssues', () => {
  it("describes a Mech's Issues in Mech terms", () => {
    expect(describeUnitProfileIssues(added('addMech'))).toEqual([
      'Bp is 0; a Mech must cost at least 1',
    ]);
  });

  it("describes a Vehicle's Issues in Vehicle terms", () => {
    const vehicle: VehicleProfile = {
      ...(added('addVehicle') as VehicleProfile),
      class: 'Ultra-light',
      staticMount: true,
    };
    expect(describeUnitProfileIssues(vehicle)).toEqual([
      "2 Hull Options is more than an Ultra-light Vehicle's 1",
      'Bp is 0; a Vehicle must cost at least 1',
    ]);
  });

  it('is empty for a Legal Unit Profile', () => {
    expect(describeUnitProfileIssues({ ...added('addVehicle'), armor: 10 })).toEqual([]);
  });
});
