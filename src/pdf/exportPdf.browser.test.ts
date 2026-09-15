import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import { buildMechCardSvg } from '../cards/mechCard';
import { testMech } from '../cards/testMech';
import type { ArmyList } from '../domain/armyList';
import { exportArmyListPdf, exportCardsPdf } from './exportPdf';

beforeAll(loadCardFonts);

describe('exportCardsPdf', () => {
  it('prints a Mech card with the card fonts embedded', async () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
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

describe('exportArmyListPdf', () => {
  // 11 fielded copies: 3 Large pages (4-up) or 2 Sleeve pages (9-up).
  const list: ArmyList = {
    version: 1,
    name: 'Iron Legion',
    bpLimit: 200,
    unitProfiles: [
      { ...testMech, id: 'a', name: 'Ironclad', quantity: 5 },
      { ...testMech, id: 'b', name: 'Reserve', quantity: 0 },
      { ...testMech, id: 'c', name: 'Scout', class: 'Light', quantity: 6 },
    ],
  };

  it.each([
    { size: 'large', pages: 3 },
    { size: 'sleeve', pages: 2 },
  ] as const)(
    'prints every fielded copy across $pages pages at $size size',
    async ({ size, pages }) => {
      const doc = await exportArmyListPdf(list, size, createValueMeasure());
      const pdf = doc.output();
      await commands.writeFile(`test-output/army-list-${size}.pdf`, btoa(pdf), 'base64');

      expect(doc.getNumberOfPages()).toBe(pages);
      // Each card draws its texture image once.
      expect(pdf.match(/\/I\d+ Do/g)).toHaveLength(11);
    },
  );
});
