export type MechClass = 'Light' | 'Medium' | 'Heavy';

export const hardpoints = ['leftArm', 'rightArm', 'leftTorso', 'rightTorso'] as const;
export type Hardpoint = (typeof hardpoints)[number];

export interface MechProfile {
  kind: 'Mech';
  name: string;
  class: MechClass;
  bp: number;
  mv: number;
  tp: number;
  hc: number;
  /** A multiple of 10, at most 150. */
  armor: number;
  notes: string;
  /** Catalog name (Weapon or Support Equipment) per Hardpoint, or null when empty. */
  hardpoints: Record<Hardpoint, string | null>;
}

// Invented sample for the first slice; replaced by Army List editing later.
export const sampleMech: MechProfile = {
  kind: 'Mech',
  name: 'Ironclad',
  class: 'Heavy',
  bp: 185,
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
};
