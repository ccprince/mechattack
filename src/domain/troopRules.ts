import { catalog, findCatalogEntry, type CatalogClass, type CatalogEntry } from './catalog';
import { troopClassStats, troopStats, type TroopClass, type TroopProfile } from './troop';

/** One broken build rule on a Troop Unit Profile. */
export type TroopIssue =
  | { rule: 'mountTooHeavy'; name: string; entryClass: CatalogClass }
  | { rule: 'notInCatalog'; name: string }
  | { rule: 'overMaxBp'; bp: number; troopClass: TroopClass; maxBp: number };

/**
 * Catalog entries the editor offers a Troop of this Class, in Catalog order: Light ones it can
 * afford within its max Bp. A picker filter, not a build rule: a pricier Light entry is only Bp over
 * max.
 */
export function eligibleCrewServedWeapons(troopClass: TroopClass): CatalogEntry[] {
  const { baseBp, maxBp } = troopClassStats[troopClass];
  return catalog.filter((entry) => entry.class === 'Light' && entry.bp <= maxBp - baseBp);
}

/**
 * The Issues on a Troop Unit Profile, whatever its quantity. Changing Class never empties the Crew
 * Served Weapon, so one the Class can't afford is reported here rather than dropped.
 */
export function troopIssues(profile: TroopProfile): TroopIssue[] {
  const issues: TroopIssue[] = [];
  const name = profile.crewServedWeapon;
  if (name !== null) {
    const entry = findCatalogEntry(name);
    if (!entry) {
      issues.push({ rule: 'notInCatalog', name });
    } else if (entry.class !== 'Light') {
      issues.push({ rule: 'mountTooHeavy', name: entry.name, entryClass: entry.class });
    }
  }
  const { bp } = troopStats(profile);
  const { maxBp } = troopClassStats[profile.class];
  if (bp > maxBp) issues.push({ rule: 'overMaxBp', bp, troopClass: profile.class, maxBp });
  return issues;
}

/** A Troop Issue in words, for the editor. */
export function describeTroopIssue(issue: TroopIssue): string {
  switch (issue.rule) {
    case 'mountTooHeavy':
      return `Crew Served Weapon: ${issue.name} is ${issue.entryClass}, but a Troop may mount only Light`;
    case 'notInCatalog':
      return `Crew Served Weapon: ${issue.name} is not in the Catalog`;
    case 'overMaxBp':
      return `Bp ${issue.bp} is more than a ${issue.troopClass} Troop's max Bp of ${issue.maxBp}`;
  }
}
