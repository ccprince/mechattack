import { z } from 'zod';
import type { NumberRange } from './numberRange';

export const mechClasses = ['Light', 'Medium', 'Heavy'] as const;
export type MechClass = (typeof mechClasses)[number];

export const hardpoints = ['leftArm', 'rightArm', 'leftTorso', 'rightTorso'] as const;
export type Hardpoint = (typeof hardpoints)[number];

export const hardpointLabels: Record<Hardpoint, string> = {
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftTorso: 'Left Torso',
  rightTorso: 'Right Torso',
};

const stat: NumberRange = { min: 0, max: 9, step: 1 };

/** The typed-in stats' ranges, shared by the schema and the editor. */
export const mechStatRanges = {
  bp: { min: 1, max: 20, step: 1 },
  mv: stat,
  tp: stat,
  hc: stat,
  armor: { min: 0, max: 150, step: 10 },
} as const satisfies Record<string, NumberRange>;

/** Copies fielded; the max only keeps typed-in values exact. */
export const quantityRange: NumberRange = { min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 };

function inRange({ min, max, step }: NumberRange) {
  return z.number().int().min(min).max(max).multipleOf(step);
}

/** Catalog name (Weapon or Support Equipment), or null when the Hardpoint is empty (ADR 0001). */
const mountedName = z.string().nullable();

export const mechProfileSchema = z.object({
  kind: z.literal('Mech'),
  /** Stable identity within the Army List; the name can change. */
  id: z.string().min(1),
  name: z.string(),
  class: z.enum(mechClasses),
  bp: inRange(mechStatRanges.bp),
  mv: inRange(mechStatRanges.mv),
  tp: inRange(mechStatRanges.tp),
  hc: inRange(mechStatRanges.hc),
  armor: inRange(mechStatRanges.armor),
  notes: z.string(),
  hardpoints: z.record(z.enum(hardpoints), mountedName),
  /** Copies fielded; 0 keeps the Unit Profile on the list without fielding it. */
  quantity: inRange(quantityRange),
});

export type MechProfile = z.infer<typeof mechProfileSchema>;
