import { findCatalogEntry, formatRv, weaponDp, type Dp } from '../domain/catalog';
import { standardEquipment, type TroopProfile } from '../domain/troop';
import type { TroopIssue } from '../domain/troopRules';
import { wrapLines, type Measure } from './fitText';
import { illegalStroke, troopIllegalNote } from './illegalNote';

/** What the Troop card's Crew Served Weapon row prints (docs/cards.md). */
export interface CrewServedWeaponRow {
  /** The full name, as stored, which is also what a name missing from the Catalog prints. */
  text: string;
  /** Blank for Support Equipment with no range, or a name missing from the Catalog. */
  rv: string | undefined;
  /** Absent for Support Equipment, which has no Dp, or a name missing from the Catalog. */
  dp: Dp | undefined;
  /** Whether the row gets a warning triangle for an Issue on the Crew Served Weapon. */
  marked: boolean;
}

/** The Crew Served Weapon row, or undefined when the Troop has none. */
export function crewServedWeaponRow(
  profile: TroopProfile,
  issues: readonly TroopIssue[],
): CrewServedWeaponRow | undefined {
  const name = profile.crewServedWeapon;
  if (name === null) return undefined;
  const entry = findCatalogEntry(name);
  return {
    // The row is wide enough for the full name; only the ILLEGAL line uses short names.
    text: entry?.name ?? name,
    rv: entry?.rv && formatRv(entry.rv),
    dp: weaponDp(entry),
    marked: issues.some((issue) => issue.rule !== 'overMaxBp'),
  };
}

/** One of the fields sharing the Troop card's Notes box, wrapped into lines. */
export interface TroopNotesBlock {
  field: 'illegal' | 'standard-equipment' | 'notes';
  lines: string[];
  /** Baseline of the first line. */
  y: number;
}

// Box width is the field map's width minus 8 units of padding (docs/cards.md).
export const troopNotesBox = { x: 16, y: 142, width: 230, fontSize: 11, lineHeight: 13 };
const notesMaxLines = 3;
const illegalMaxLines = 1;

/**
 * The Notes box's fields, top to bottom: the `ILLEGAL:` line when there are Issues, the Standard
 * Equipment, then the player's notes in the lines left, left out when there are none.
 */
export function troopNotes(
  profile: TroopProfile,
  issues: readonly TroopIssue[],
  measure: Measure,
): TroopNotesBlock[] {
  const { y, width, fontSize, lineHeight } = troopNotesBox;
  const blocks: TroopNotesBlock[] = [];
  let used = 0;
  const add = (field: TroopNotesBlock['field'], lines: string[]) => {
    blocks.push({ field, lines, y: y + used * lineHeight });
    used += lines.length;
  };

  const illegal = troopIllegalNote(issues);
  if (illegal) {
    // The stroke widens each glyph by its width, so the line wraps that much narrower.
    add('illegal', wrapLines(illegal, width - illegalStroke, fontSize, illegalMaxLines, measure));
  }
  const equipment = standardEquipment(profile.class).join(', ');
  add('standard-equipment', wrapLines(equipment, width, fontSize, 1, measure));
  const left = notesMaxLines - used;
  if (left > 0) add('notes', wrapLines(profile.notes, width, fontSize, left, measure));
  return blocks;
}
