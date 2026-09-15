import type { TroopProfile } from '../domain/troop';

/** A Legal Troop with a Crew Served Weapon for card and PDF tests: 3 of its Troop Class's 4 Bp. */
export const testTroop: TroopProfile = {
  kind: 'Troop',
  id: 'test-troop',
  name: 'Rangers',
  class: 'Light Infantry',
  crewServedWeapon: 'Light Missile',
  notes: 'Holds the ridge.',
  quantity: 1,
};
