import mechTemplate from '../../cards/mech-card.svg?raw';
import { hardpoints, type Hardpoint, type MechProfile } from '../domain/mech';
import { findCatalogEntry, formatRv } from '../domain/catalog';
import { fitLine, wrapLines, type Measure } from './fitText';
import { armorCrossOut } from './geometry';
import { addCrossOut, addValue, addWrappedValue, parseTemplate } from './svgTemplate';

// Box widths below are the field map's box width minus 8 units of padding (docs/cards.md).
const hardpointFields: Record<
  Hardpoint,
  { prefix: string; labelX: number; rvX: number; y: number }
> = {
  leftArm: { prefix: 'la', labelX: 15, rvX: 101, y: 467 },
  rightArm: { prefix: 'ra', labelX: 198, rvX: 284, y: 467 },
  leftTorso: { prefix: 'lt', labelX: 15, rvX: 101, y: 496 },
  rightTorso: { prefix: 'rt', labelX: 198, rvX: 284, y: 496 },
};
const hvOffset = 43;
const topArmorRow = 150;

export function buildMechCardSvg(profile: MechProfile, measure: Measure): SVGSVGElement {
  const { svg, data } = parseTemplate(mechTemplate);

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

  centered('bp', String(profile.bp), 211, 46, 70, 16);
  line('name', profile.name, 258, 42, 116);
  line('class', profile.class, 258, 78, 116);
  line('mv', String(profile.mv), 258, 114, 116);
  line('tp', String(profile.tp), 258, 150, 116);
  line('hc', String(profile.hc), 258, 186, 116);
  line('armor', String(profile.armor), 258, 222, 116);
  addWrappedValue(data, 'notes', wrapLines(profile.notes, 116, 10, 12, measure), 258, 260, 10, 14);

  for (const hardpoint of hardpoints) {
    const entryName = profile.hardpoints[hardpoint];
    const entry = entryName ? findCatalogEntry(entryName) : undefined;
    if (!entry) continue;
    const { prefix, labelX, rvX, y } = hardpointFields[hardpoint];
    line(`${prefix}-weapon`, entry.shortName, labelX, y - 3, 60, 9);
    if (entry.rv) centered(`${prefix}-rv`, formatRv(entry.rv), rvX, y, 35, 11);
    if (entry.hv !== undefined)
      centered(`${prefix}-hv`, String(entry.hv), rvX + hvOffset, y, 35, 11);
  }

  return svg;
}
