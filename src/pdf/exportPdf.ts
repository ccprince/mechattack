import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { Measure } from '../cards/fitText';
import { cardFonts } from '../cards/fonts';
import { buildUnitCardSvg, hasCard, type CardedUnitProfile } from '../cards/unitCard';
import { slotRect, slotsPerPage, type PrintSize } from '../cards/pageLayout';
import { fieldedCopies, type ArmyList } from '../domain/armyList';
import type { UnitProfile } from '../domain/unitProfile';
import { rasterizeTexture } from './texture';

export interface PrintableCard {
  kind: UnitProfile['kind'];
  svg: SVGSVGElement;
}

const pointsPerInch = 72;

/**
 * Prints one card per fielded copy of every Mech and Vehicle Unit Profile on the Army List, in list
 * order. Troops don't print yet: their card isn't built.
 */
export function exportArmyListPdf(
  list: ArmyList,
  size: PrintSize,
  measure: Measure,
): Promise<jsPDF> {
  // Copies of a Unit Profile share one card: exportCardsPdf never changes the SVG it's given.
  const svgs = new Map<CardedUnitProfile, SVGSVGElement>();
  const cards = fieldedCopies(list)
    .filter(hasCard)
    .map((profile): PrintableCard => {
      let svg = svgs.get(profile);
      if (!svg) {
        svg = buildUnitCardSvg(profile, measure);
        svgs.set(profile, svg);
      }
      return { kind: profile.kind, svg };
    });
  return exportCardsPdf(cards, size);
}

/** Lays cards out on US Letter pages at one print size and returns the PDF document. */
export async function exportCardsPdf(cards: PrintableCard[], size: PrintSize): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  await registerFonts(doc);

  for (const [index, card] of cards.entries()) {
    const slotIndex = index % slotsPerPage(size);
    if (index > 0 && slotIndex === 0) doc.addPage();
    const slot = slotRect(size, slotIndex);
    const x = slot.x * pointsPerInch;
    const y = slot.y * pointsPerInch;
    const width = slot.width * pointsPerInch;
    const height = slot.height * pointsPerInch;

    // Draw the texture image first, under the vector card. A fixed alias embeds it once per kind.
    const texture = await rasterizeTexture(card.kind, card.svg);
    doc.addImage(texture, 'JPEG', x, y, width, height, `texture-${card.kind}`);

    const vector = card.svg.cloneNode(true) as SVGSVGElement;
    vector.querySelector('#texture')?.remove();
    await svg2pdf(vector, doc, { x, y, width, height });
  }
  return doc;
}

let fontData:
  Promise<{ file: string; family: string; weight: number; base64: string }[]> | undefined;

async function registerFonts(doc: jsPDF): Promise<void> {
  fontData ??= Promise.all(
    cardFonts.map(async ({ file, family, weight, url }) => {
      const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
      return { file, family, weight: Number(weight), base64: toBase64(bytes) };
    }),
  );
  for (const { file, family, weight, base64 } of await fontData) {
    doc.addFileToVFS(file, base64);
    // svg2pdf looks fonts up by family plus a style key built from the weight ('normal' for 400,
    // '600normal' for 600). Registered under any other key, it silently draws in Times-Roman.
    doc.addFont(file, family, 'normal', weight);
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
