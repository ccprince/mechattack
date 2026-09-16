import { describe, expect, it } from 'vitest';
import { armyListReducer } from './armyListReducer';
import { describeUnitProfileIssues, type UnitProfile } from './unitProfile';
import type { MechProfile } from './mech';
import type { TroopProfile } from './troop';
import type { VehicleProfile } from './vehicle';

/** A new Unit Profile of that kind, as Add Mech, Add Vehicle or Add Troop makes it. */
function added(type: 'addMech' | 'addVehicle' | 'addTroop'): UnitProfile {
  const state = armyListReducer(
    { list: { version: 2, name: 'Test', bpLimit: 50, unitProfiles: [] }, selectedId: null },
    { type },
  );
  return state.list.unitProfiles[0]!;
}

describe('describeUnitProfileIssues', () => {
  it("describes a Mech's Issues in Mech terms", () => {
    const mech: MechProfile = { ...(added('addMech') as MechProfile), armor: 0 };
    expect(describeUnitProfileIssues(mech)).toEqual(['Bp is 0; a Mech must cost at least 1']);
  });

  it("describes a Vehicle's Issues in Vehicle terms", () => {
    const vehicle: VehicleProfile = {
      ...(added('addVehicle') as VehicleProfile),
      class: 'Ultra-light',
      staticMount: true,
      armor: 0,
    };
    expect(describeUnitProfileIssues(vehicle)).toEqual([
      "2 Hull Options is more than an Ultra-light Vehicle's 1",
      'Bp is 0; a Vehicle must cost at least 1',
    ]);
  });

  it("describes a Troop's Issues in Troop terms", () => {
    const troop: TroopProfile = {
      ...(added('addTroop') as TroopProfile),
      class: 'Jump Infantry',
      crewServedWeapon: 'Medium Laser',
    };
    expect(describeUnitProfileIssues(troop)).toEqual([
      'Crew Served Weapon: Medium Laser is Medium, but a Troop may mount only Light',
      "Bp 7 is more than a Jump Infantry Troop's max Bp of 6",
    ]);
  });

  it('is empty for a Legal Unit Profile', () => {
    expect(describeUnitProfileIssues(added('addVehicle'))).toEqual([]);
  });
});
