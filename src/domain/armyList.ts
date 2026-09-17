import { z } from 'zod';
import type { NumberRange } from './numberRange';
import {
  unitProfileBp,
  unitProfileIssues,
  unitProfileSchema,
  type UnitProfile,
} from './unitProfile';

/**
 * Any whole number of Bp from 0 up, though − and + move it by 5; the max only keeps typed-in values
 * exact.
 */
export const bpLimitRange: NumberRange = {
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
  step: 1,
  stride: 5,
};

export const armyListSchema = z.object({
  /** Bumped with a migration whenever the saved shape changes. */
  version: z.literal(2),
  name: z.string(),
  bpLimit: z.number().int().min(bpLimitRange.min).max(bpLimitRange.max),
  unitProfiles: z
    .array(unitProfileSchema)
    .refine((profiles) => new Set(profiles.map(({ id }) => id)).size === profiles.length, {
      message: 'Unit Profile ids must be unique',
    }),
});

export type ArmyList = z.infer<typeof armyListSchema>;

/** An empty Army List, as a new one starts. */
export function newArmyList(): ArmyList {
  return { version: 2, name: 'New Army List', bpLimit: 100, unitProfiles: [] };
}

/**
 * Bp of every fielded copy of these Unit Profiles: each one's Bp times its quantity. Takes the Unit
 * Profiles rather than the Army List so part of a list — one kind's section — subtotals the same way.
 */
export function bpOfCopies(profiles: UnitProfile[]): number {
  return profiles.reduce((total, profile) => total + unitProfileBp(profile) * profile.quantity, 0);
}

/** Bp of every fielded copy on the Army List: what counts against the Bp Limit. */
export function bpTotal(list: ArmyList): number {
  return bpOfCopies(list.unitProfiles);
}

/** One entry per fielded copy, in list order: what prints. A quantity of 0 prints nothing. */
export function fieldedCopies(list: ArmyList): UnitProfile[] {
  return list.unitProfiles.flatMap((profile) => Array<UnitProfile>(profile.quantity).fill(profile));
}

/** Whether anything would print. */
export function hasFieldedCopies(list: ArmyList): boolean {
  return list.unitProfiles.some((profile) => profile.quantity > 0);
}

/** The fielded Unit Profiles with Issues, in list order: the ones that would print marked. */
export function fieldedWithIssues(list: ArmyList): UnitProfile[] {
  return list.unitProfiles.filter(
    (profile) => profile.quantity > 0 && unitProfileIssues(profile).length > 0,
  );
}

/** A warning for the Army List, never a block (and not an Issue). */
export function isOverBpLimit(list: ArmyList): boolean {
  return bpTotal(list) > list.bpLimit;
}

/**
 * Whether another Unit Profile on the list shares this one's name, ignoring surrounding spaces. A
 * name should be unique, so the editor flags a clash, but it isn't an Issue. Blank names never clash.
 */
export function hasNameClash(list: ArmyList, profile: UnitProfile): boolean {
  const name = profile.name.trim();
  return (
    name !== '' &&
    list.unitProfiles.some((other) => other.id !== profile.id && other.name.trim() === name)
  );
}
