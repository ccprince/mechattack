import { findCatalogEntry } from '../domain/catalog';
import { hardpointLabels } from '../domain/mech';
import type { MechIssue } from '../domain/mechRules';
import { vehicleMountRowLabels } from '../domain/vehicle';
import type { VehicleIssue } from '../domain/vehicleRules';

/** Strokes the ILLEGAL line in the `.val` fill color to embolden it: only the 600 weight is bundled. */
export const illegalStroke = 0.6;

/**
 * The `ILLEGAL:` line that heads Notes on a Mech card with Issues, or undefined on a Legal card. Kept
 * short to leave room for the notes: the Hardpoint markers already show where each Issue is.
 */
export function illegalNote(issues: readonly MechIssue[]): string | undefined {
  return note(issues, shortMechIssue);
}

/** The `ILLEGAL:` line that heads Notes on a Vehicle card with Issues, or undefined on a Legal card. */
export function vehicleIllegalNote(issues: readonly VehicleIssue[]): string | undefined {
  return note(issues, shortVehicleIssue);
}

function note<I>(issues: readonly I[], shortIssue: (issue: I) => string): string | undefined {
  const [issue] = issues;
  if (!issue) return undefined;
  return `ILLEGAL: ${issues.length > 1 ? `${issues.length} issues` : shortIssue(issue)}`;
}

function shortMechIssue(issue: MechIssue): string {
  switch (issue.rule) {
    case 'mountTooHeavy':
      return `${shortName(issue.name)} too heavy`;
    case 'supportEquipmentOnArm':
      return `${shortName(issue.name)} on an arm`;
    case 'notInCatalog':
      return `${hardpointLabels[issue.hardpoint]} not in Catalog`;
    case 'overMaxBp':
      return 'Bp over max';
    case 'noBp':
      return 'Bp is 0';
  }
}

function shortVehicleIssue(issue: VehicleIssue): string {
  switch (issue.rule) {
    case 'mountTooHeavy':
      return `${vehicleMountRowLabels[issue.mount]}: ${shortName(issue.name)} too heavy`;
    case 'notInCatalog':
      return `${vehicleMountRowLabels[issue.mount]}: ${issue.name} not in Catalog`;
    case 'overHullOptions':
      return 'Hull Options over';
    case 'overMaxBp':
      return 'Bp over max';
    case 'noBp':
      return 'Bp is 0';
  }
}

/** The rules name only Catalog entries in the Issues that use a short name, so the lookup falls back just in case. */
function shortName(name: string): string {
  return findCatalogEntry(name)?.shortName ?? name;
}
