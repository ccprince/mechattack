import { z } from 'zod';
import type { NumberRange } from './numberRange';
import { inRange, mountedName, quantityRange } from './profileFields';

export const vehicleClasses = ['Ultra-light', 'Light', 'Medium'] as const;
export type VehicleClass = (typeof vehicleClasses)[number];

/** A Vehicle's mounts: one in the Turret, two in the Static Mount (ADR 0003). */
export const vehicleMounts = ['turret', 'staticMount1', 'staticMount2'] as const;
export type VehicleMount = (typeof vehicleMounts)[number];

export const vehicleMountLabels: Record<VehicleMount, string> = {
  turret: 'Turret',
  staticMount1: 'Static Mount 1',
  staticMount2: 'Static Mount 2',
};

/** Each mount's label on the Vehicle card's mount rows, short to leave room for the entry. */
export const vehicleMountRowLabels: Record<VehicleMount, string> = {
  turret: 'Turret',
  staticMount1: 'Static',
  staticMount2: 'Static',
};

/** The chosen upgrades' ranges, shared by the schema and the editor. */
export const vehicleUpgradeRanges = {
  armor: { min: 0, max: 60, step: 10 },
  engineUpgrades: { min: 0, max: 2, step: 1 },
  cargoBays: { min: 0, max: 2, step: 1 },
} as const satisfies Record<string, NumberRange>;

export const vehicleProfileSchema = z.object({
  kind: z.literal('Vehicle'),
  /** Stable identity within the Army List; the name can change. */
  id: z.string().min(1),
  name: z.string(),
  class: z.enum(vehicleClasses),
  armor: inRange(vehicleUpgradeRanges.armor),
  engineUpgrades: inRange(vehicleUpgradeRanges.engineUpgrades),
  /** Whether the Vehicle takes a Turret; its mount is `mounts.turret`. */
  turret: z.boolean(),
  /** Whether the Vehicle takes a Static Mount; its mounts are `mounts.staticMount1` and `2`. */
  staticMount: z.boolean(),
  cargoBays: inRange(vehicleUpgradeRanges.cargoBays),
  notes: z.string(),
  mounts: z.record(z.enum(vehicleMounts), mountedName),
  /** Copies fielded; 0 keeps the Unit Profile on the list without fielding it. */
  quantity: inRange(quantityRange),
});

export type VehicleProfile = z.infer<typeof vehicleProfileSchema>;

interface HullOptionFlags {
  turret: boolean;
  staticMount: boolean;
}

/**
 * The mounts of the Hull Options the Vehicle takes, in `vehicleMounts` order. The others hold nothing
 * that counts: unticking a Hull Option empties them.
 */
export function takenMounts({ turret, staticMount }: HullOptionFlags): VehicleMount[] {
  return vehicleMounts.filter((mount) => (mount === 'turret' ? turret : staticMount));
}
