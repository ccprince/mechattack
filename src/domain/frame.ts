import { findCatalogEntry } from './catalog';
import { hardpoints, type MechClass, type MechProfile } from './mech';
import { takenMounts, type VehicleClass, type VehicleProfile } from './vehicle';

/** A Mech Class's starting stats and the most Bp a Mech of that Class may cost. Costs no Bp itself. */
export interface MechFrame {
  maxBp: number;
  mv: number;
  tp: number;
  hc: number;
}

export const mechFrames: Record<MechClass, MechFrame> = {
  Light: { maxBp: 8, mv: 5, tp: 5, hc: 4 },
  Medium: { maxBp: 14, mv: 4, tp: 4, hc: 4 },
  Heavy: { maxBp: 20, mv: 3, tp: 3, hc: 4 },
};

/** A Vehicle Class's starting stats, most Bp and how many Hull Options it may take. Costs no Bp. */
export interface VehicleFrame {
  maxBp: number;
  mv: number;
  tp: number;
  hullOptions: number;
}

export const vehicleFrames: Record<VehicleClass, VehicleFrame> = {
  'Ultra-light': { maxBp: 4, mv: 5, tp: 5, hullOptions: 1 },
  Light: { maxBp: 5, mv: 4, tp: 4, hullOptions: 2 },
  Medium: { maxBp: 6, mv: 3, tp: 4, hullOptions: 2 },
};

export interface MechStats {
  bp: number;
  mv: number;
  tp: number;
  hc: number;
}

export interface VehicleStats {
  bp: number;
  mv: number;
  tp: number;
}

const armorPerBp = 10;
const heatSinkBp = 2;
const engineUpgradeBp = 2;
const cargoBayBp = 1;

/**
 * A Mech's stats, worked out from its Frame, upgrades and mounts. A mount counts whether or not it
 * fits the Class; a name missing from the Catalog costs nothing, since its Bp is unknown.
 */
export function mechStats(profile: MechProfile): MechStats {
  const frame = mechFrames[profile.class];
  const names = hardpoints.map((hardpoint) => profile.hardpoints[hardpoint]);
  return {
    bp:
      profile.armor / armorPerBp +
      profile.heatSinks * heatSinkBp +
      profile.engineUpgrades * engineUpgradeBp +
      mountsBp(names),
    ...engineUpgraded(frame, profile.engineUpgrades),
    hc: frame.hc + profile.heatSinks,
  };
}

/**
 * A Vehicle's stats, worked out from its Frame, upgrades and Hull Options. The Turret and Static
 * Mount cost nothing, but their mounts count as a Mech's do. A mount of a Hull Option the Vehicle
 * doesn't take counts nothing.
 */
export function vehicleStats(profile: VehicleProfile): VehicleStats {
  const frame = vehicleFrames[profile.class];
  const names = takenMounts(profile).map((mount) => profile.mounts[mount]);
  return {
    bp:
      profile.armor / armorPerBp +
      profile.engineUpgrades * engineUpgradeBp +
      profile.cargoBays * cargoBayBp +
      mountsBp(names),
    ...engineUpgraded(frame, profile.engineUpgrades),
  };
}

/** Hull Options a Vehicle takes: 1 for the Turret, 2 for the Static Mount, 1 per Cargo Bay. */
export function hullOptionsUsed({ turret, staticMount, cargoBays }: VehicleProfile): number {
  return (turret ? 1 : 0) + (staticMount ? 2 : 0) + cargoBays;
}

function mountsBp(names: readonly (string | null)[]): number {
  return names.reduce(
    (total, name) => total + (name === null ? 0 : (findCatalogEntry(name)?.bp ?? 0)),
    0,
  );
}

/** The first Engine Upgrade adds Mv, the second Tp. */
function engineUpgraded(frame: { mv: number; tp: number }, engineUpgrades: number) {
  return {
    mv: frame.mv + (engineUpgrades >= 1 ? 1 : 0),
    tp: frame.tp + (engineUpgrades >= 2 ? 1 : 0),
  };
}
