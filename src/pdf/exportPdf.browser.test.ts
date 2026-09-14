import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import { buildMechCardSvg } from '../cards/mechCard';
import { sampleMech } from '../domain/mech';
import { exportCardsPdf } from './exportPdf';

beforeAll(loadCardFonts);

describe('exportCardsPdf', () => {
  it('prints a Mech card with the card fonts embedded', async () => {
    const svg = buildMechCardSvg(sampleMech, createValueMeasure());
    const doc = await exportCardsPdf([{ kind: 'Mech', svg }], 'large');
    const pdf = doc.output();
    // Written to disk for inspection by eye (gitignored).
    await commands.writeFile('test-output/mech-card.pdf', btoa(pdf), 'base64');

    expect(doc.getNumberOfPages()).toBe(1);
    expect(pdf).toContain('/FontName /Alfa#20Slab#20One');
    expect(pdf).toContain('/FontName /Roboto#20Slab');
    // An embedded font with an empty width table drew no glyphs: svg2pdf fell back to Times-Roman.
    expect(pdf).not.toContain('/W []');
  });
});
