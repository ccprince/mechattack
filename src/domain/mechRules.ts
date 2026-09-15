import {
  catalog,
  catalogClasses,
  findCatalogEntry,
  type CatalogClass,
  type CatalogEntry,
} from './catalog';
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
  | { rule: 'bpBelowMounts'; bp: number; mountsBp: number };

const armHardpoints: readonly Hardpoint[] = ['leftArm', 'rightArm'];

/** Whether a Catalog entry of `entryClass` is no heavier than a Mech of `mechClass`. */
function fitsClass(entryClass: CatalogEntry['class'], mechClass: MechClass): boolean {
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
  let mountsBp = 0;
  for (const hardpoint of hardpoints) {
    const name = profile.hardpoints[hardpoint];
    if (name === null) continue;
    const entry = findCatalogEntry(name);
    if (!entry) {
      issues.push({ rule: 'notInCatalog', hardpoint, name });
      continue;
    }
    mountsBp += entry.bp;
    if (!fitsClass(entry.class, profile.class)) {
      issues.push({ rule: 'mountTooHeavy', hardpoint, name: entry.name, entryClass: entry.class });
    }
    if (!fitsHardpoint(entry, hardpoint)) {
      issues.push({ rule: 'supportEquipmentOnArm', hardpoint, name: entry.name });
    }
  }
  // A lower bound only: Armor and upgrades also cost Bp, pending the Unit construction session.
  if (profile.bp < mountsBp) issues.push({ rule: 'bpBelowMounts', bp: profile.bp, mountsBp });
  return issues;
}

/** An Issue in words, for the editor. */
export function describeIssue(issue: Issue): string {
  switch (issue.rule) {
    case 'mountTooHeavy':
      return `${hardpointLabels[issue.hardpoint]}: ${issue.name} is ${issue.entryClass}, heavier than the Mech's Class`;
    case 'supportEquipmentOnArm':
      return `${hardpointLabels[issue.hardpoint]}: ${issue.name} is Support Equipment, which only fits a torso Hardpoint`;
    case 'notInCatalog':
      return `${hardpointLabels[issue.hardpoint]}: ${issue.name} is not in the Catalog`;
    case 'bpBelowMounts':
      return `Bp ${issue.bp} is less than the ${issue.mountsBp} Bp it mounts`;
  }
}
