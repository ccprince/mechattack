import { z } from 'zod';

export const mechClasses = ['Light', 'Medium', 'Heavy'] as const;
export type MechClass = (typeof mechClasses)[number];

export const hardpoints = ['leftArm', 'rightArm', 'leftTorso', 'rightTorso'] as const;
export type Hardpoint = (typeof hardpoints)[number];

const stat = z.number().int().min(0).max(9);
/** Catalog name (Weapon or Support Equipment), or null when the Hardpoint is empty (ADR 0001). */
const mountedName = z.string().nullable();

export const mechProfileSchema = z.object({
  kind: z.literal('Mech'),
  /** Stable identity within the Army List; the name can change. */
  id: z.string().min(1),
  name: z.string(),
  class: z.enum(mechClasses),
  bp: z.number().int().min(1).max(20),
  mv: stat,
  tp: stat,
  hc: stat,
  armor: z.number().int().min(0).max(150).multipleOf(10),
  notes: z.string(),
  hardpoints: z.record(z.enum(hardpoints), mountedName),
  /** Copies fielded; 0 keeps the Unit Profile on the list without fielding it. */
  quantity: z.number().int().min(0),
});

export type MechProfile = z.infer<typeof mechProfileSchema>;

// Invented sample for the first slice; replaced by Army List editing later.
export const sampleMech: MechProfile = {
  kind: 'Mech',
  id: 'sample',
  name: 'Ironclad',
  class: 'Heavy',
  bp: 18,
  mv: 4,
  tp: 2,
  hc: 3,
  armor: 110,
  notes: 'Jump jets (Mv +2). ECM suite blocks enemy targeting within 6".',
  hardpoints: {
    leftArm: 'Heavy Missile',
    rightArm: 'Heavy Laser',
    leftTorso: 'Improved Weapon Targeting System',
    rightTorso: null,
  },
  quantity: 1,
};
