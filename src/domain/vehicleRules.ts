import {
  catalog,
  catalogClasses,
  findCatalogEntry,
  type CatalogClass,
  type CatalogEntry,
} from './catalog';
import { hullOptionsUsed, vehicleFrames, vehicleStats } from './frame';
import {
  fittedMounts,
  vehicleMountLabels,
  type VehicleClass,
  type VehicleMount,
  type VehicleProfile,
} from './vehicle';

/** One broken build rule on a Vehicle Unit Profile. */
export type VehicleIssue =
  | { rule: 'mountTooHeavy'; mount: VehicleMount; name: string; entryClass: CatalogClass }
  | { rule: 'notInCatalog'; mount: VehicleMount; name: string }
  | { rule: 'overHullOptions'; used: number; vehicleClass: VehicleClass; hullOptions: number }
  | { rule: 'overMaxBp'; bp: number; vehicleClass: VehicleClass; maxBp: number }
  | { rule: 'noBp' };

/** The heaviest Class each Vehicle Class may mount: Light, and on a Medium Vehicle Medium too. */
const heaviestMount: Record<VehicleClass, CatalogClass> = {
  'Ultra-light': 'Light',
  Light: 'Light',
  Medium: 'Medium',
};

function fitsClass(entryClass: CatalogClass, vehicleClass: VehicleClass): boolean {
  return catalogClasses.indexOf(entryClass) <= catalogClasses.indexOf(heaviestMount[vehicleClass]);
}

/** Catalog entries a Vehicle of this Class may mount, in Catalog order. Every mount takes any. */
export function eligibleVehicleMounts(vehicleClass: VehicleClass): CatalogEntry[] {
  return catalog.filter((entry) => fitsClass(entry.class, vehicleClass));
}

/**
 * The Issues on a Vehicle Unit Profile, whatever its quantity. Changing Class never removes a Hull
 * Option or a mount, so one that no longer fits is reported here rather than dropped.
 */
export function vehicleIssues(profile: VehicleProfile): VehicleIssue[] {
  const issues: VehicleIssue[] = [];
  for (const mount of fittedMounts(profile)) {
    const name = profile.mounts[mount];
    if (name === null) continue;
    const entry = findCatalogEntry(name);
    if (!entry) {
      issues.push({ rule: 'notInCatalog', mount, name });
    } else if (!fitsClass(entry.class, profile.class)) {
      issues.push({ rule: 'mountTooHeavy', mount, name: entry.name, entryClass: entry.class });
    }
  }
  const frame = vehicleFrames[profile.class];
  const used = hullOptionsUsed(profile);
  const vehicleClass = profile.class;
  if (used > frame.hullOptions) {
    issues.push({ rule: 'overHullOptions', used, vehicleClass, hullOptions: frame.hullOptions });
  }
  const { bp } = vehicleStats(profile);
  if (bp > frame.maxBp) issues.push({ rule: 'overMaxBp', bp, vehicleClass, maxBp: frame.maxBp });
  if (bp === 0) issues.push({ rule: 'noBp' });
  return issues;
}

/** A Vehicle Issue in words, for the editor. */
export function describeVehicleIssue(issue: VehicleIssue): string {
  switch (issue.rule) {
    case 'mountTooHeavy':
      return `${vehicleMountLabels[issue.mount]}: ${issue.name} is ${issue.entryClass}, heavier than the Vehicle's Class may mount`;
    case 'notInCatalog':
      return `${vehicleMountLabels[issue.mount]}: ${issue.name} is not in the Catalog`;
    case 'overHullOptions':
      return `${issue.used} Hull Options is more than ${article(issue.vehicleClass)} ${issue.vehicleClass} Vehicle's ${issue.hullOptions}`;
    case 'overMaxBp':
      return `Bp ${issue.bp} is more than ${article(issue.vehicleClass)} ${issue.vehicleClass} Vehicle's max Bp of ${issue.maxBp}`;
    case 'noBp':
      return 'Bp is 0; a Vehicle must cost at least 1';
  }
}

function article(vehicleClass: VehicleClass): string {
  return vehicleClass === 'Ultra-light' ? 'an' : 'a';
}
