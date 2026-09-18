import { z } from 'zod';
import type { NumberRange } from './numberRange';
import {
  unitKinds,
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

/**
 * The Unit Profiles grouped by kind — Mechs, then Vehicles, then Troops — keeping the order they
 * were added in within each kind. This is the order the editor shows and the order cards print in,
 * so a printed stack matches what the player built on screen. Stored order is insertion order
 * alone, which no player chose.
 */
export function orderedUnitProfiles(list: ArmyList): UnitProfile[] {
  return unitKinds.flatMap((kind) => list.unitProfiles.filter((profile) => profile.kind === kind));
}

/** One fielded copy of a Unit Profile: one printed card. */
export interface FieldedCopy {
  profile: UnitProfile;
  /**
   * Which copy of this name it is, from 1, or undefined when it's the only fielded copy carrying
   * the name: a card no other card can be confused with is never numbered.
   */
  copyNumber?: number;
}

/**
 * One entry per fielded copy, in `orderedUnitProfiles` order: what prints, in print order. A
 * quantity of 0 prints nothing.
 *
 * Copies sharing a name are numbered from 1 across the whole Army List, not per Unit Profile, so
 * that no two printed cards read alike — which is the only thing a Copy Number is for. They're
 * numbered in that same print order, so the numbers climb as the cards are dealt out. Names are
 * compared trimmed, as the editor's clash warning does, and a blank name pools like any other.
 */
export function fieldedCopies(list: ArmyList): FieldedCopy[] {
  const profiles = orderedUnitProfiles(list).flatMap((profile) =>
    Array<UnitProfile>(profile.quantity).fill(profile),
  );
  const totals = new Map<string, number>();
  for (const { name } of profiles) {
    totals.set(name.trim(), (totals.get(name.trim()) ?? 0) + 1);
  }
  const counted = new Map<string, number>();
  return profiles.map((profile) => {
    const name = profile.name.trim();
    if (totals.get(name) === 1) return { profile };
    const copyNumber = (counted.get(name) ?? 0) + 1;
    counted.set(name, copyNumber);
    return { profile, copyNumber };
  });
}

/** Whether anything would print. */
export function hasFieldedCopies(list: ArmyList): boolean {
  return list.unitProfiles.some((profile) => profile.quantity > 0);
}

/** The fielded Unit Profiles with Issues, in print order: the ones that would print marked. */
export function fieldedWithIssues(list: ArmyList): UnitProfile[] {
  return orderedUnitProfiles(list).filter(
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
