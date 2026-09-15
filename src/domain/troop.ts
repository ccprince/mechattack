import { z } from 'zod';
import { findCatalogEntry } from './catalog';
import { inRange, mountedName, quantityRange } from './profileFields';

/** Stored and printed in full. */
export const troopClasses = ['Light Infantry', 'Heavy Infantry', 'Jump Infantry'] as const;
export type TroopClass = (typeof troopClasses)[number];

/**
 * What a Troop Class alone sets: nothing a Troop takes changes Mv, Tp or Sv. Unlike a Frame, it
 * costs its Base Bp.
 */
export interface TroopClassStats {
  baseBp: number;
  maxBp: number;
  mv: number;
  tp: number;
  sv: number;
}

export const troopClassStats: Record<TroopClass, TroopClassStats> = {
  'Light Infantry': { baseBp: 2, maxBp: 4, mv: 3, tp: 4, sv: 5 },
  'Heavy Infantry': { baseBp: 3, maxBp: 5, mv: 3, tp: 4, sv: 10 },
  'Jump Infantry': { baseBp: 5, maxBp: 6, mv: 4, tp: 4, sv: 10 },
};

export const troopProfileSchema = z.object({
  kind: z.literal('Troop'),
  /** Stable identity within the Army List; the name can change. */
  id: z.string().min(1),
  name: z.string(),
  class: z.enum(troopClasses),
  /** A Troop's single mount. */
  crewServedWeapon: mountedName,
  notes: z.string(),
  /** Copies fielded; 0 keeps the Unit Profile on the list without fielding it. */
  quantity: inRange(quantityRange),
});

export type TroopProfile = z.infer<typeof troopProfileSchema>;

export interface TroopStats {
  bp: number;
  mv: number;
  tp: number;
  sv: number;
}

/**
 * A Troop's stats: its Troop Class's, plus the Crew Served Weapon's Bp. The mount counts whether or
 * not it's Light; a name missing from the Catalog costs nothing, since its Bp is unknown.
 */
export function troopStats(profile: TroopProfile): TroopStats {
  const { baseBp, mv, tp, sv } = troopClassStats[profile.class];
  const name = profile.crewServedWeapon;
  const weaponBp = name === null ? 0 : (findCatalogEntry(name)?.bp ?? 0);
  return { bp: baseBp + weaponBp, mv, tp, sv };
}

/** What a Troop has because of its Class, outside the Catalog and costing nothing. */
export function standardEquipment(troopClass: TroopClass): string[] {
  return troopClass === 'Jump Infantry'
    ? ['Individual Weapons', 'Jump Packs']
    : ['Individual Weapons'];
}
