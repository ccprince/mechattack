import { findCatalogEntry } from '../domain/catalog';
import { hardpointLabels } from '../domain/mech';
import type { Issue } from '../domain/mechRules';

/**
 * The `ILLEGAL:` line that heads Notes on a card with Issues, or undefined on a Legal card. Kept
 * short to leave room for the notes: the Hardpoint markers already show where each Issue is.
 */
export function illegalNote(issues: readonly Issue[]): string | undefined {
  const [issue] = issues;
  if (!issue) return undefined;
  return `ILLEGAL: ${issues.length > 1 ? `${issues.length} issues` : shortIssue(issue)}`;
}

function shortIssue(issue: Issue): string {
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

/** Both rules only report Catalog entries, so the lookup falls back just in case. */
function shortName(name: string): string {
  return findCatalogEntry(name)?.shortName ?? name;
}
