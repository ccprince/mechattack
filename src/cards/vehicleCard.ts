import vehicleTemplate from '../../cards/vehicle-card.svg?raw';
import { vehicleStats } from '../domain/frame';
import type { VehicleProfile } from '../domain/vehicle';
import { vehicleIssues } from '../domain/vehicleRules';
import { dpDrawing } from './dpShape';
import { fitLine, wrapLines, type Measure } from './fitText';
import { armorCrossOut } from './geometry';
import { illegalStroke } from './illegalNote';
import {
  addCrossOut,
  addDp,
  addValue,
  addWarningTriangle,
  addWrappedValue,
  parseTemplate,
} from './svgTemplate';
import { mountRows, vehicleNotes, vehicleNotesBox } from './vehicleCardContent';

// Box widths below are the field map's box width minus 8 units of padding (docs/cards.md).
const topArmorRow = 60;
/** Baselines of the two mount rows' weapon lines; each row's Rv sits 2 lower. */
const mountRowBaselines = [465, 514];
/** Each mount row's Dp area, 4×4 cells of 7.75 in the Dp column (docs/cards.md). */
const dpAreas = [
  { x: 320, y: 435, width: 58, height: 49, cellSize: 7.75, rollsFontSize: 11 },
  { x: 320, y: 484, width: 58, height: 50, cellSize: 7.75, rollsFontSize: 11 },
];
/**
 * A long name wraps to a second line at the same size rather than shrinking away. The wrapped pair
 * starts `wrapDy` above the row's baseline, so it stays centered in the row.
 */
const mountRow = {
  weaponX: 16,
  rvX: 276,
  rvDy: 2,
  fontSize: 14,
  lineHeight: 15,
  maxLines: 2,
  wrapDy: -7.5,
};
/** Mv and Tp print large in the middle of their cell: they're read constantly in play. */
const statValue = { x: 316, width: 80, fontSize: 24 };
// Full names run to the end of the row, where canvas measurement under-reports the rendered width
// by a few percent, so these keep 8 more padding than the field map's ~8.
const weaponWidth = { unmarked: 204, marked: 188 };
// Illegal marks (docs/cards.md): the name triangle, and each mount row's marker relative to its row.
const nameMark = { x: 364, y: 15, width: 12, height: 11 };
const mountRowMark = { x: 217, dy: -9, width: 11, height: 10 };

export function buildVehicleCardSvg(profile: VehicleProfile, measure: Measure): SVGSVGElement {
  const { svg, data } = parseTemplate(vehicleTemplate);
  const issues = vehicleIssues(profile);

  const crossOut = armorCrossOut(profile.armor, topArmorRow);
  if (crossOut) addCrossOut(data, crossOut);

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

  const stats = vehicleStats(profile);
  line('bp', String(stats.bp), 211, 46, 70, 16, 'middle');
  line('name', profile.name, 258, 44, 116);
  line('type', profile.class, 258, 90, 116);
  const stat = (field: string, value: number, y: number) =>
    line(field, String(value), statValue.x, y, statValue.width, statValue.fontSize, 'middle');
  stat('mv', stats.mv, 136);
  stat('tp', stats.tp, 182);
  line('armor', String(profile.armor), 258, 228, 116);

  // A printed card is taken as Legal at the table, so an illegal one says so (docs/cards.md).
  if (issues.length > 0) addWarningTriangle(data, 'illegal', nameMark);
  const { x: notesX, fontSize, lineHeight } = vehicleNotesBox;
  for (const { field, lines, y } of vehicleNotes(profile, issues, measure)) {
    const text = addWrappedValue(data, field, lines, notesX, y, fontSize, lineHeight);
    if (field === 'illegal') {
      text.style.stroke = '#1a1a1a';
      text.style.strokeWidth = `${illegalStroke}px`;
    }
  }

  for (const [index, row] of mountRows(profile, issues).entries()) {
    const prefix = `mount${index + 1}`;
    const y = mountRowBaselines[index]!;
    if (row.marked) {
      const { x, dy, width, height } = mountRowMark;
      addWarningTriangle(data, `${prefix}-illegal`, { x, y: y + dy, width, height });
    }
    const maxWidth = weaponWidth[row.marked ? 'marked' : 'unmarked'];
    const weapon = wrapLines(row.text, maxWidth, mountRow.fontSize, mountRow.maxLines, measure);
    addWrappedValue(
      data,
      `${prefix}-weapon`,
      weapon,
      mountRow.weaponX,
      y + (weapon.length > 1 ? mountRow.wrapDy : 0),
      mountRow.fontSize,
      mountRow.lineHeight,
    );
    if (row.rv) line(`${prefix}-rv`, row.rv, mountRow.rvX, y + mountRow.rvDy, 80, 16, 'middle');
    if (row.dp) addDp(data, prefix, dpDrawing(row.dp, dpAreas[index]!, measure));
  }

  return svg;
}
