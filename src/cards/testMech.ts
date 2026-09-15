import type { MechProfile } from '../domain/mech';

/** A fully loaded Mech for card and PDF tests. */
export const testMech: MechProfile = {
  kind: 'Mech',
  id: 'test',
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
