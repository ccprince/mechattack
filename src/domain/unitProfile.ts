import { z } from 'zod';
import { mechStats, vehicleStats } from './frame';
import { mechProfileSchema } from './mech';
import { describeMechIssue, mechIssues, type MechIssue } from './mechRules';
import { vehicleProfileSchema } from './vehicle';
import { describeVehicleIssue, vehicleIssues, type VehicleIssue } from './vehicleRules';

/** A Mech or Vehicle; its kind is fixed when it's created. */
export const unitProfileSchema = z.discriminatedUnion('kind', [
  mechProfileSchema,
  vehicleProfileSchema,
]);

export type UnitProfile = z.infer<typeof unitProfileSchema>;

export type Issue = MechIssue | VehicleIssue;

/** The Unit Profile's worked-out Bp, for one copy. */
export function unitProfileBp(profile: UnitProfile): number {
  return profile.kind === 'Mech' ? mechStats(profile).bp : vehicleStats(profile).bp;
}

/** The Issues on a Unit Profile of either kind, whatever its quantity. */
export function unitProfileIssues(profile: UnitProfile): Issue[] {
  return profile.kind === 'Mech' ? mechIssues(profile) : vehicleIssues(profile);
}

/** The Issues on a Unit Profile of either kind in words, for the editor. */
export function describeUnitProfileIssues(profile: UnitProfile): string[] {
  return profile.kind === 'Mech'
    ? mechIssues(profile).map(describeMechIssue)
    : vehicleIssues(profile).map(describeVehicleIssue);
}
