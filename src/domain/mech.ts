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

/** The chosen upgrades' ranges, shared by the schema and the editor. Frame Bp is the real limit. */
export const mechUpgradeRanges = {
  armor: { min: 0, max: 150, step: 10 },
  /** 10 Heat Sinks cost 20 Bp, the most any Frame allows. */
  heatSinks: { min: 0, max: 10, step: 1 },
  engineUpgrades: { min: 0, max: 2, step: 1 },
} as const satisfies Record<string, NumberRange>;

/** Copies fielded. 100 is far more than any game needs, and keeps printing every copy cheap. */
export const quantityRange: NumberRange = { min: 0, max: 100, step: 1 };

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
  armor: inRange(mechUpgradeRanges.armor),
  heatSinks: inRange(mechUpgradeRanges.heatSinks),
  engineUpgrades: inRange(mechUpgradeRanges.engineUpgrades),
  notes: z.string(),
  hardpoints: z.record(z.enum(hardpoints), mountedName),
  /** Copies fielded; 0 keeps the Unit Profile on the list without fielding it. */
  quantity: inRange(quantityRange),
});

export type MechProfile = z.infer<typeof mechProfileSchema>;
