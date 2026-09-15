import type { MechProfile } from '../domain/mech';

/** A fully loaded, Legal Mech for card and PDF tests: 19 of its Frame's 20 Bp. */
export const testMech: MechProfile = {
  kind: 'Mech',
  id: 'test',
  name: 'Ironclad',
  class: 'Heavy',
  armor: 70,
  heatSinks: 1,
  engineUpgrades: 1,
  notes: 'Jump jets (Mv +2). ECM suite blocks enemy targeting within 6".',
  hardpoints: {
    leftArm: 'Heavy Missile',
    rightArm: 'Heavy Laser',
    leftTorso: 'Improved Weapon Targeting System',
    rightTorso: null,
  },
  quantity: 1,
};
