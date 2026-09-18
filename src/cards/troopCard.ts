import troopTemplate from '../../cards/troops-card.svg?raw';
import { troopStats, type TroopProfile } from '../domain/troop';
import { troopIssues } from '../domain/troopRules';
import { dpDrawing } from './dpShape';
import { fitLine, fitOrWrap, type Measure } from './fitText';
import { strengthCrossOut } from './geometry';
import { illegalStroke } from './illegalNote';
import { addNameRowCorner } from './nameRowCorner';
import {
  addCrossOut,
  addDp,
  addValue,
  addWarningTriangle,
  addWrappedValue,
  parseTemplate,
} from './svgTemplate';
import { crewServedWeaponRow, troopNotes, troopNotesBox } from './troopCardContent';

// Box widths below are the field map's box width minus 8 units of padding (docs/cards.md).
// Full names run to the end of the row, where canvas measurement under-reports the rendered width
// by a few percent, so these keep 8 more padding than the field map's ~8.
const weaponWidth = { unmarked: 128, marked: 112 };
/**
 * A long name wraps to a second line rather than shrinking away. The row has the height to keep the
 * wrapped pair at full size; it starts `wrapDy` above the single line's baseline.
 */
const weaponRow = { x: 15, y: 223, fontSize: 13, lineHeight: 14, maxLines: 2, wrapDy: -4 };
/** Mv, Tp and Sv print large in the middle of their cell: they're read constantly in play. */
const statValue = { x: 316, width: 80, fontSize: 24 };
const weaponMark = { x: 140, y: 214, width: 11, height: 10 };
/** The Crew Served Weapon's Dp area, 3×3 cells of 12 (docs/cards.md). */
const dpArea = { x: 214, y: 191, width: 36, height: 56, cellSize: 12, rollsFontSize: 11 };

export function buildTroopCardSvg(
  profile: TroopProfile,
  measure: Measure,
  copyNumber?: number,
): SVGSVGElement {
  const { svg, data } = parseTemplate(troopTemplate);
  const issues = troopIssues(profile);
  const stats = troopStats(profile);

  for (const block of strengthCrossOut(stats.sv)) addCrossOut(data, block);

  const line = (
    field: string,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size = 12,
    anchor: 'start' | 'middle' = 'start',
  ) => {
    const fitted = fitLine(text, maxWidth, size, measure);
    addValue(data, field, fitted.text, x, y, fitted.fontSize, anchor);
  };

  line('bp', String(stats.bp), 211, 43, 70, 16, 'middle');
  line('name', profile.name, 258, 44, 116);
  line('type', profile.class, 258, 91, 116);
  const stat = (field: string, value: number, y: number) =>
    line(field, String(value), statValue.x, y, statValue.width, statValue.fontSize, 'middle');
  stat('mv', stats.mv, 138);
  stat('tp', stats.tp, 185);
  stat('sv', stats.sv, 232);

  // A printed card is taken as Legal at the table, so an illegal one says so (docs/cards.md).
  addNameRowCorner(data, copyNumber, issues.length > 0);
  const { x: notesX, fontSize, lineHeight } = troopNotesBox;
  for (const { field, lines, y } of troopNotes(profile, issues, measure)) {
    const text = addWrappedValue(data, field, lines, notesX, y, fontSize, lineHeight);
    if (field === 'illegal') {
      text.style.stroke = '#1a1a1a';
      text.style.strokeWidth = `${illegalStroke}px`;
    }
  }

  const row = crewServedWeaponRow(profile, issues);
  if (row) {
    if (row.marked) addWarningTriangle(data, 'weapon-illegal', weaponMark);
    const weapon = fitOrWrap(
      row.text,
      weaponWidth[row.marked ? 'marked' : 'unmarked'],
      weaponRow.fontSize,
      weaponRow.fontSize,
      weaponRow.maxLines,
      measure,
    );
    addWrappedValue(
      data,
      'weapon',
      weapon.lines,
      weaponRow.x,
      weaponRow.y + (weapon.lines.length > 1 ? weaponRow.wrapDy : 0),
      weapon.fontSize,
      weaponRow.lineHeight,
    );
    if (row.rv) line('rv', row.rv, 184.5, 229, 51, 16, 'middle');
    if (row.dp) addDp(data, 'weapon', dpDrawing(row.dp, dpArea, measure));
  }

  return svg;
}
