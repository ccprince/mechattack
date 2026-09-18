import { z } from 'zod';
import { mechStats, vehicleStats } from './frame';
import { mechProfileSchema } from './mech';
import { describeMechIssue, mechIssues, type MechIssue } from './mechRules';
import { troopProfileSchema, troopStats } from './troop';
import { describeTroopIssue, troopIssues, type TroopIssue } from './troopRules';
import { vehicleProfileSchema } from './vehicle';
import { describeVehicleIssue, vehicleIssues, type VehicleIssue } from './vehicleRules';

/** A Mech, Vehicle or Troop; its kind is fixed when it's created. */
export const unitProfileSchema = z.discriminatedUnion('kind', [
  mechProfileSchema,
  vehicleProfileSchema,
  troopProfileSchema,
]);

export type UnitProfile = z.infer<typeof unitProfileSchema>;

/**
 * The three kinds in the order an Army List always presents them, on screen and in print. Nothing
 * lets a player order Unit Profiles themselves, so this is the only order either can offer.
 */
export const unitKinds: readonly UnitProfile['kind'][] = ['Mech', 'Vehicle', 'Troop'];

export type Issue = MechIssue | VehicleIssue | TroopIssue;

/** The Unit Profile's worked-out Bp, for one copy. */
export function unitProfileBp(profile: UnitProfile): number {
  switch (profile.kind) {
    case 'Mech':
      return mechStats(profile).bp;
    case 'Vehicle':
      return vehicleStats(profile).bp;
    case 'Troop':
      return troopStats(profile).bp;
  }
}

/** The Issues on a Unit Profile of any kind, whatever its quantity. */
export function unitProfileIssues(profile: UnitProfile): Issue[] {
  switch (profile.kind) {
    case 'Mech':
      return mechIssues(profile);
    case 'Vehicle':
      return vehicleIssues(profile);
    case 'Troop':
      return troopIssues(profile);
  }
}

/** The Issues on a Unit Profile of any kind in words, for the editor. */
export function describeUnitProfileIssues(profile: UnitProfile): string[] {
  switch (profile.kind) {
    case 'Mech':
      return mechIssues(profile).map(describeMechIssue);
    case 'Vehicle':
      return vehicleIssues(profile).map(describeVehicleIssue);
    case 'Troop':
      return troopIssues(profile).map(describeTroopIssue);
  }
}
