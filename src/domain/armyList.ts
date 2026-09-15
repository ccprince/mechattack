import { z } from 'zod';
import { mechProfileSchema } from './mech';
import type { NumberRange } from './numberRange';

/** Any whole number of Bp from 0 up; the max only keeps typed-in values exact. */
export const bpLimitRange: NumberRange = { min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 };

export const armyListSchema = z.object({
  /** Bumped with a migration whenever the saved shape changes. */
  version: z.literal(1),
  name: z.string(),
  bpLimit: z.number().int().min(bpLimitRange.min).max(bpLimitRange.max),
  unitProfiles: z
    .array(mechProfileSchema)
    .refine((profiles) => new Set(profiles.map(({ id }) => id)).size === profiles.length, {
      message: 'Unit Profile ids must be unique',
    }),
});

export type ArmyList = z.infer<typeof armyListSchema>;

/** Bp of every fielded copy: each Unit Profile's Bp times its quantity. */
export function bpTotal(list: ArmyList): number {
  return list.unitProfiles.reduce((total, profile) => total + profile.bp * profile.quantity, 0);
}

/** A warning for the Army List, never a block (and not an Issue). */
export function isOverBpLimit(list: ArmyList): boolean {
  return bpTotal(list) > list.bpLimit;
}
