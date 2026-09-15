import { findCatalogEntry } from './catalog';
import { hardpoints, type MechClass, type MechProfile } from './mech';

/** A Mech Class's starting stats and the most Bp a Mech of that Class may cost. Costs no Bp itself. */
export interface Frame {
  maxBp: number;
  mv: number;
  tp: number;
  hc: number;
}

export const frames: Record<MechClass, Frame> = {
  Light: { maxBp: 8, mv: 5, tp: 5, hc: 4 },
  Medium: { maxBp: 14, mv: 4, tp: 4, hc: 4 },
  Heavy: { maxBp: 20, mv: 3, tp: 3, hc: 4 },
};

export interface MechStats {
  bp: number;
  mv: number;
  tp: number;
  hc: number;
}

const armorPerBp = 10;
const heatSinkBp = 2;
const engineUpgradeBp = 2;

/**
 * A Mech's stats, worked out from its Frame, upgrades and mounts. A mount counts whether or not it
 * fits the Class; a name missing from the Catalog costs nothing, since its Bp is unknown.
 */
export function mechStats(profile: MechProfile): MechStats {
  const frame = frames[profile.class];
  const mountsBp = hardpoints.reduce((total, hardpoint) => {
    const name = profile.hardpoints[hardpoint];
    return total + (name === null ? 0 : (findCatalogEntry(name)?.bp ?? 0));
  }, 0);
  return {
    bp:
      profile.armor / armorPerBp +
      profile.heatSinks * heatSinkBp +
      profile.engineUpgrades * engineUpgradeBp +
      mountsBp,
    // The first Engine Upgrade adds Mv, the second Tp.
    mv: frame.mv + (profile.engineUpgrades >= 1 ? 1 : 0),
    tp: frame.tp + (profile.engineUpgrades >= 2 ? 1 : 0),
    hc: frame.hc + profile.heatSinks,
  };
}
