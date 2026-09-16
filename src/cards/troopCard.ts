import troopTemplate from '../../cards/troops-card.svg?raw';
import { troopStats, type TroopProfile } from '../domain/troop';
import { troopIssues } from '../domain/troopRules';
import { dpDrawing } from './dpShape';
import { fitLine, type Measure } from './fitText';
import { strengthCrossOut } from './geometry';
import { illegalStroke } from './illegalNote';
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
const weaponFontSize = 13;
/** Mv, Tp and Sv print large in the middle of their cell: they're read constantly in play. */
const statValue = { x: 316, width: 80, fontSize: 24 };
// Illegal marks (docs/cards.md): the name triangle, and the Crew Served Weapon row's marker.
const nameMark = { x: 364, y: 15, width: 12, height: 11 };
const weaponMark = { x: 140, y: 205, width: 11, height: 10 };
/** The Crew Served Weapon's Dp area, 3×3 cells of 12 (docs/cards.md). */
const dpArea = { x: 214, y: 182, width: 36, height: 56, cellSize: 12, rollsFontSize: 11 };

export function buildTroopCardSvg(profile: TroopProfile, measure: Measure): SVGSVGElement {
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
  line('type', profile.class, 258, 89.2, 116);
  const stat = (field: string, value: number, y: number) =>
    line(field, String(value), statValue.x, y, statValue.width, statValue.fontSize, 'middle');
  stat('mv', stats.mv, 134.4);
  stat('tp', stats.tp, 179.6);
  stat('sv', stats.sv, 224.8);

  // A printed card is taken as Legal at the table, so an illegal one says so (docs/cards.md).
  if (issues.length > 0) addWarningTriangle(data, 'illegal', nameMark);
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
    line(
      'weapon',
      row.text,
      15,
      214,
      weaponWidth[row.marked ? 'marked' : 'unmarked'],
      weaponFontSize,
    );
    if (row.rv) line('rv', row.rv, 184.5, 220, 51, 16, 'middle');
    if (row.dp) addDp(data, 'weapon', dpDrawing(row.dp, dpArea, measure));
  }

  return svg;
}
