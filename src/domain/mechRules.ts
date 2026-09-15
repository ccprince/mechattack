import {
  catalog,
  catalogClasses,
  findCatalogEntry,
  type CatalogClass,
  type CatalogEntry,
} from './catalog';
import { frames, mechStats } from './frame';
import {
  hardpointLabels,
  hardpoints,
  type Hardpoint,
  type MechClass,
  type MechProfile,
} from './mech';

/** One broken build rule on a Unit Profile. */
export type Issue =
  | { rule: 'mountTooHeavy'; hardpoint: Hardpoint; name: string; entryClass: CatalogClass }
  | { rule: 'supportEquipmentOnArm'; hardpoint: Hardpoint; name: string }
  | { rule: 'notInCatalog'; hardpoint: Hardpoint; name: string }
  | { rule: 'overMaxBp'; bp: number; mechClass: MechClass; maxBp: number }
  | { rule: 'noBp' };

const armHardpoints: readonly Hardpoint[] = ['leftArm', 'rightArm'];

/** Whether a Catalog entry of `entryClass` is no heavier than a Mech of `mechClass`. */
function fitsClass(entryClass: CatalogClass, mechClass: MechClass): boolean {
  return catalogClasses.indexOf(entryClass) <= catalogClasses.indexOf(mechClass);
}

/** Catalog entries a Mech of this Class may mount on this Hardpoint, in Catalog order. */
export function eligibleMounts(mechClass: MechClass, hardpoint: Hardpoint): CatalogEntry[] {
  return catalog.filter(
    (entry) => fitsClass(entry.class, mechClass) && fitsHardpoint(entry, hardpoint),
  );
}

/** Support Equipment takes a torso Hardpoint; Weapons fit any. */
function fitsHardpoint(entry: CatalogEntry, hardpoint: Hardpoint): boolean {
  return entry.kind === 'Weapon' || !armHardpoints.includes(hardpoint);
}

/**
 * The Issues on a Mech Unit Profile, whatever its quantity. Changing Class never removes a mount,
 * so a mount that no longer fits is reported here rather than dropped.
 */
export function unitProfileIssues(profile: MechProfile): Issue[] {
  const issues: Issue[] = [];
  for (const hardpoint of hardpoints) {
    const name = profile.hardpoints[hardpoint];
    if (name === null) continue;
    const entry = findCatalogEntry(name);
    if (!entry) {
      issues.push({ rule: 'notInCatalog', hardpoint, name });
      continue;
    }
    if (!fitsClass(entry.class, profile.class)) {
      issues.push({ rule: 'mountTooHeavy', hardpoint, name: entry.name, entryClass: entry.class });
    }
    if (!fitsHardpoint(entry, hardpoint)) {
      issues.push({ rule: 'supportEquipmentOnArm', hardpoint, name: entry.name });
    }
  }
  const { bp } = mechStats(profile);
  const { maxBp } = frames[profile.class];
  if (bp > maxBp) issues.push({ rule: 'overMaxBp', bp, mechClass: profile.class, maxBp });
  if (bp === 0) issues.push({ rule: 'noBp' });
  return issues;
}

/** An Issue in words, for the editor. */
export function describeIssue(issue: Issue): string {
  if (issue.rule === 'overMaxBp') {
    return `Bp ${issue.bp} is more than a ${issue.mechClass} Mech's max Bp of ${issue.maxBp}`;
  }
  if (issue.rule === 'noBp') return 'Bp is 0; a Mech must cost at least 1';
  const mount = `${hardpointLabels[issue.hardpoint]}: ${issue.name}`;
  switch (issue.rule) {
    case 'mountTooHeavy':
      return `${mount} is ${issue.entryClass}, heavier than the Mech's Class`;
    case 'supportEquipmentOnArm':
      return `${mount} is Support Equipment, which only fits a torso Hardpoint`;
    case 'notInCatalog':
      return `${mount} is not in the Catalog`;
  }
}
