import type { Rect } from '../cards/geometry';

export interface PdfText {
  text: string;
  /** Drawn with a stroke over its fill (text render mode 2), as emboldened text is. */
  stroked: boolean;
}

/**
 * Reads back what jsPDF wrote, for export tests. Handles only what our export produces: an
 * uncompressed PDF whose embedded fonts are Identity-H with a `bfchar` ToUnicode map.
 */
export function readPdf(pdf: string): { texts: PdfText[]; triangles: Rect[] } {
  return { texts: readTexts(pdf), triangles: readTriangles(pdf) };
}

function readTexts(pdf: string): PdfText[] {
  const objects = new Map<string, string>();
  for (const [, id, body] of pdf.matchAll(/^(\d+) 0 obj\n([\s\S]*?)\nendobj$/gm)) {
    objects.set(id!, body!);
  }
  // Font resource name (F16) to its glyph id → text map.
  const glyphMaps = new Map<string, Map<string, string>>();
  for (const [, name, id] of pdf.matchAll(/\/(F\d+) (\d+) 0 R/g)) {
    const cmapId = /\/ToUnicode (\d+) 0 R/.exec(objects.get(id!) ?? '')?.[1];
    if (!cmapId) continue;
    const glyphs = new Map<string, string>();
    for (const [, glyph, unicode] of (objects.get(cmapId) ?? '').matchAll(
      /<([0-9a-f]{4})><([0-9a-f]+)>/gi,
    )) {
      const codes = unicode!.match(/.{4}/g) ?? [];
      glyphs.set(glyph!.toLowerCase(), String.fromCharCode(...codes.map((c) => parseInt(c, 16))));
    }
    glyphMaps.set(name!, glyphs);
  }

  const texts: PdfText[] = [];
  // Text render mode is graphics state, so q and Q save and restore it.
  const renderModes = [0];
  let glyphs: Map<string, string> | undefined;
  const operators = /^(q|Q)$|^(\d) Tr$|^\/(F\d+) [\d.]+ Tf$|^<([0-9a-f]+)> Tj$/gm;
  for (const [, saveOrRestore, mode, font, hex] of pdf.matchAll(operators)) {
    if (saveOrRestore === 'q') renderModes.push(renderModes.at(-1)!);
    else if (saveOrRestore === 'Q') renderModes.pop();
    else if (mode !== undefined) renderModes[renderModes.length - 1] = Number(mode);
    else if (font !== undefined) glyphs = glyphMaps.get(font);
    else if (hex !== undefined && glyphs) {
      const text = (hex.match(/.{4}/g) ?? []).map((glyph) => glyphs!.get(glyph) ?? '�').join('');
      texts.push({ text, stroked: renderModes.at(-1) === 2 });
    }
  }
  return texts;
}

/** Closed three-point paths drawn with fill and stroke, as the warning triangles are, in card units. */
function readTriangles(pdf: string): Rect[] {
  const point = String.raw`([\d.]+) ([\d.]+)`;
  const triangle = new RegExp(String.raw`^${point} m\n${point} l\n${point} l\nh\nB$`, 'gm');
  return Array.from(pdf.matchAll(triangle), (match) => {
    const [xs, ys] = [0, 1].map((axis) =>
      [1, 3, 5].map((group) => Number(match[group + axis])),
    ) as [number[], number[]];
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  });
}
