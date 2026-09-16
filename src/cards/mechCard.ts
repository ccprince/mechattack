import mechTemplate from '../../cards/mech-card.svg?raw';
import { hardpoints, type Hardpoint, type MechProfile } from '../domain/mech';
import { findCatalogEntry, formatRv, weaponDp } from '../domain/catalog';
import { mechStats } from '../domain/frame';
import { mechIssues } from '../domain/mechRules';
import { dpDrawing } from './dpShape';
import { fitLine, wrapLines, type Measure } from './fitText';
import { armorCrossOut } from './geometry';
import { illegalNote, illegalStroke } from './illegalNote';
import {
  addCrossOut,
  addDp,
  addValue,
  addWarningTriangle,
  addWrappedValue,
  parseTemplate,
} from './svgTemplate';

// Box widths below are the field map's box width minus 8 units of padding (docs/cards.md).
const hardpointFields: Record<
  Hardpoint,
  { prefix: string; labelX: number; rvX: number; y: number; dp: { x: number; y: number } }
> = {
  leftArm: { prefix: 'la', labelX: 15, rvX: 101, y: 467, dp: { x: 166, y: 440 } },
  rightArm: { prefix: 'ra', labelX: 198, rvX: 284, y: 467, dp: { x: 349, y: 440 } },
  leftTorso: { prefix: 'lt', labelX: 15, rvX: 101, y: 496, dp: { x: 166, y: 469 } },
  rightTorso: { prefix: 'rt', labelX: 198, rvX: 284, y: 496, dp: { x: 349, y: 469 } },
};
/** A Hardpoint's Dp area: 5×5 cells of 5.8 in 29 × 29 (docs/cards.md). */
const dpArea = { width: 29, height: 29, cellSize: 5.8, rollsFontSize: 9 };
const hvOffset = 43;
const topArmorRow = 150;
const notes = { x: 258, y: 260, width: 116, fontSize: 10, lineHeight: 14, maxLines: 12 };
const illegalMaxLines = 2;
// Illegal marks (docs/cards.md): the name triangle, and each Hardpoint marker relative to its row.
const nameMark = { x: 364, y: 15, width: 12, height: 11 };
const hardpointMark = { dx: 52, dy: -12, width: 11, height: 10 };
const weaponWidth = { unmarked: 60, marked: 48 };

export function buildMechCardSvg(profile: MechProfile, measure: Measure): SVGSVGElement {
  const { svg, data } = parseTemplate(mechTemplate);
  const issues = mechIssues(profile);

  const crossOut = armorCrossOut(profile.armor, topArmorRow);
  if (crossOut) addCrossOut(data, crossOut);

  const line = (field: string, text: string, x: number, y: number, maxWidth: number, size = 12) => {
    const fitted = fitLine(text, maxWidth, size, measure);
    addValue(data, field, fitted.text, x, y, fitted.fontSize);
  };
  const centered = (
    field: string,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
  ) => {
    const fitted = fitLine(text, maxWidth, size, measure);
    addValue(data, field, fitted.text, x, y, fitted.fontSize, 'middle');
  };
  const wrapInNotesBox = (
    field: string,
    text: string,
    y: number,
    maxLines: number,
    maxWidth = notes.width,
  ) => {
    const lines = wrapLines(text, maxWidth, notes.fontSize, maxLines, measure);
    return addWrappedValue(data, field, lines, notes.x, y, notes.fontSize, notes.lineHeight);
  };

  const stats = mechStats(profile);
  centered('bp', String(stats.bp), 211, 46, 70, 16);
  line('name', profile.name, 258, 42, 116);
  line('class', profile.class, 258, 78, 116);
  line('mv', String(stats.mv), 258, 114, 116);
  line('tp', String(stats.tp), 258, 150, 116);
  line('hc', String(stats.hc), 258, 186, 116);
  line('armor', String(profile.armor), 258, 222, 116);

  // A printed card is taken as Legal at the table, so an illegal one says so (docs/cards.md).
  const illegalText = illegalNote(issues);
  let illegalLines = 0;
  if (illegalText) {
    // The stroke widens each glyph by its width, so the line wraps that much narrower.
    const maxWidth = notes.width - illegalStroke;
    const illegal = wrapInNotesBox('illegal', illegalText, notes.y, illegalMaxLines, maxWidth);
    illegal.style.stroke = '#1a1a1a';
    illegal.style.strokeWidth = `${illegalStroke}px`;
    illegalLines = illegal.childElementCount;
    addWarningTriangle(data, 'illegal', nameMark);
  }
  wrapInNotesBox(
    'notes',
    profile.notes,
    notes.y + illegalLines * notes.lineHeight,
    notes.maxLines - illegalLines,
  );

  for (const hardpoint of hardpoints) {
    const { prefix, labelX, rvX, y, dp } = hardpointFields[hardpoint];
    const marked = issues.some((issue) => 'hardpoint' in issue && issue.hardpoint === hardpoint);
    if (marked) {
      const { dx, dy, width, height } = hardpointMark;
      addWarningTriangle(data, `${prefix}-illegal`, { x: labelX + dx, y: y + dy, width, height });
    }

    const entryName = profile.hardpoints[hardpoint];
    const entry = entryName ? findCatalogEntry(entryName) : undefined;
    if (!entry) continue;
    line(
      `${prefix}-weapon`,
      entry.shortName,
      labelX,
      y - 3,
      weaponWidth[marked ? 'marked' : 'unmarked'],
      9,
    );
    if (entry.rv) centered(`${prefix}-rv`, formatRv(entry.rv), rvX, y, 35, 11);
    if (entry.hv !== undefined)
      centered(`${prefix}-hv`, String(entry.hv), rvX + hvOffset, y, 35, 11);
    // Support Equipment has no Dp, so its area stays empty.
    const weapon = weaponDp(entry);
    if (weapon) addDp(data, prefix, dpDrawing(weapon, { ...dp, ...dpArea }, measure));
  }

  return svg;
}
