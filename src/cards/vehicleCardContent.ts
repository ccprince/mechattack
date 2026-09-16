import { findCatalogEntry, formatRv, weaponDp, type Dp } from '../domain/catalog';
import {
  takenMounts,
  vehicleMountRowLabels,
  type VehicleMount,
  type VehicleProfile,
} from '../domain/vehicle';
import type { VehicleIssue } from '../domain/vehicleRules';
import { wrapLines, type Measure } from './fitText';
import { illegalStroke, vehicleIllegalNote } from './illegalNote';

/** What one of the Vehicle card's two mount rows prints (docs/cards.md). */
export interface MountRow {
  mount: VehicleMount;
  /** The row label and entry, `Turret: Light Laser`. */
  text: string;
  /** Blank for Support Equipment with no range, or a name missing from the Catalog. */
  rv: string | undefined;
  /** Absent for Support Equipment, which has no Dp, or a name missing from the Catalog. */
  dp: Dp | undefined;
  /** Whether the row gets a warning triangle for an Issue on its mount. */
  marked: boolean;
}

const mountRowCount = 2;

/**
 * The filled mounts of the Hull Options the Vehicle takes, one per row in Turret, Static Mount order.
 * A Legal Vehicle fills at most two, so an illegal one's extra mounts are dropped.
 */
export function mountRows(profile: VehicleProfile, issues: readonly VehicleIssue[]): MountRow[] {
  return takenMounts(profile)
    .flatMap((mount): MountRow[] => {
      const name = profile.mounts[mount];
      if (name === null) return [];
      const entry = findCatalogEntry(name);
      return [
        {
          mount,
          // The row is wide enough for the full name; only the ILLEGAL line uses short names.
          text: `${vehicleMountRowLabels[mount]}: ${entry?.name ?? name}`,
          rv: entry?.rv && formatRv(entry.rv),
          dp: weaponDp(entry),
          marked: issues.some((issue) => 'mount' in issue && issue.mount === mount),
        },
      ];
    })
    .slice(0, mountRowCount);
}

/** One of the fields sharing the Notes box, wrapped into lines. */
export interface NotesBlock {
  field: 'illegal' | 'cargo-bays' | 'notes';
  lines: string[];
  /** Baseline of the first line. */
  y: number;
}

// Box width is the field map's width minus 8 units of padding (docs/cards.md).
export const vehicleNotesBox = { x: 16, y: 277, width: 358, fontSize: 11, lineHeight: 14 };
const notesMaxLines = 9;
const illegalMaxLines = 2;

/**
 * The Notes box's fields, top to bottom: the `ILLEGAL:` line when there are Issues, the Cargo Bays
 * when there are any, then the player's notes in the lines left.
 */
export function vehicleNotes(
  profile: VehicleProfile,
  issues: readonly VehicleIssue[],
  measure: Measure,
): NotesBlock[] {
  const { y, width, fontSize, lineHeight } = vehicleNotesBox;
  const blocks: NotesBlock[] = [];
  let used = 0;
  const add = (field: NotesBlock['field'], lines: string[]) => {
    blocks.push({ field, lines, y: y + used * lineHeight });
    used += lines.length;
  };

  const illegal = vehicleIllegalNote(issues);
  if (illegal) {
    // The stroke widens each glyph by its width, so the line wraps that much narrower.
    add('illegal', wrapLines(illegal, width - illegalStroke, fontSize, illegalMaxLines, measure));
  }
  if (profile.cargoBays > 0) add('cargo-bays', [`Cargo Bay ×${profile.cargoBays}`]);
  add('notes', wrapLines(profile.notes, width, fontSize, notesMaxLines - used, measure));
  return blocks;
}
