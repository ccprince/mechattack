import type { VehicleProfile } from '../domain/vehicle';

/** A Legal Vehicle with a Turret and a Cargo Bay for card and PDF tests: 4 of its Frame's 5 Bp. */
export const testVehicle: VehicleProfile = {
  kind: 'Vehicle',
  id: 'test-vehicle',
  name: 'Hellhound',
  class: 'Light',
  armor: 20,
  engineUpgrades: 0,
  turret: true,
  staticMount: false,
  cargoBays: 1,
  notes: 'Amphibious. Smoke launchers (1/game).',
  mounts: { turret: 'Light Laser', staticMount1: null, staticMount2: null },
  quantity: 1,
};
