export interface Rv {
  normal: number;
  extended: number;
}

export interface Weapon {
  /** Unique and permanent; Army Lists reference Weapons by this name (ADR 0001). */
  name: string;
  shortName: string;
  rv: Rv;
  /** Only Mech Weapons have Hv. */
  hv?: number;
}

// Placeholder entries until the real Weapon Catalog is entered. Dp waits for its design session.
export const weaponCatalog = [
  { name: 'Autocannon', shortName: 'AC', rv: { normal: 12, extended: 24 }, hv: 1 },
  { name: 'Laser', shortName: 'LSR', rv: { normal: 15, extended: 30 }, hv: 3 },
  { name: 'Short Range Missiles', shortName: 'SRM', rv: { normal: 6, extended: 12 }, hv: 2 },
] as const satisfies readonly Weapon[];

export function findWeapon(name: string): Weapon | undefined {
  return weaponCatalog.find((weapon) => weapon.name === name);
}
