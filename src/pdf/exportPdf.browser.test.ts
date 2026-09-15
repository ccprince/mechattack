import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import { buildMechCardSvg } from '../cards/mechCard';
import { testMech } from '../cards/testMech';
import { testVehicle } from '../cards/testVehicle';
import type { ArmyList } from '../domain/armyList';
import type { UnitProfile } from '../domain/unitProfile';
import { exportArmyListPdf, exportCardsPdf } from './exportPdf';
import { readPdf } from './readPdf';

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
    version: 2,
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

  it('prints every fielded copy of a list mixing Mechs and Vehicles, in list order', async () => {
    // 6 fielded copies: 2 Large pages.
    const mixed: ArmyList = {
      version: 2,
      name: 'Combined Arms',
      bpLimit: 200,
      unitProfiles: [
        { ...testVehicle, id: 'v1', name: 'Hellhound', quantity: 2 },
        { ...testMech, id: 'm1', name: 'Ironclad', quantity: 1 },
        { ...testVehicle, id: 'v2', name: 'Parked', quantity: 0 },
        { ...testVehicle, id: 'v3', name: 'Outrider', quantity: 3 },
      ],
    };
    const doc = await exportArmyListPdf(mixed, 'large', createValueMeasure());
    const pdf = doc.output();
    await commands.writeFile('test-output/mixed-army-list-large.pdf', btoa(pdf), 'base64');

    expect(doc.getNumberOfPages()).toBe(2);
    expect(pdf.match(/\/I\d+ Do/g)).toHaveLength(6);
    const names = readPdf(pdf)
      .texts.map(({ text }) => text)
      .filter((text) => ['Hellhound', 'Ironclad', 'Parked', 'Outrider'].includes(text));
    expect(names).toEqual([
      'Hellhound',
      'Hellhound',
      'Ironclad',
      'Outrider',
      'Outrider',
      'Outrider',
    ]);
  });

  it("skips Troops, whose card isn't built yet", async () => {
    const withTroops: ArmyList = {
      version: 2,
      name: 'Combined Arms',
      bpLimit: 200,
      unitProfiles: [
        {
          kind: 'Troop',
          id: 't1',
          name: 'Rifles',
          class: 'Light Infantry',
          crewServedWeapon: null,
          notes: '',
          quantity: 2,
        },
        { ...testMech, id: 'm1', name: 'Ironclad', quantity: 1 },
      ],
    };
    const doc = await exportArmyListPdf(withTroops, 'large', createValueMeasure());
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.output().match(/\/I\d+ Do/g)).toHaveLength(1);
  });
});

describe('illegal marks', () => {
  const printed = async (profile: UnitProfile) => {
    const list: ArmyList = { version: 2, name: 'Marks', bpLimit: 50, unitProfiles: [profile] };
    const doc = await exportArmyListPdf(list, 'large', createValueMeasure());
    return readPdf(doc.output());
  };

  it('prints the triangles and a bold ILLEGAL line on an illegal card', async () => {
    const { texts, triangles } = await printed({
      ...testMech,
      class: 'Medium',
      // Kept within the Medium Frame's Bp, so only the mounts have Issues.
      armor: 0,
      hardpoints: {
        leftArm: 'Heavy Missile',
        rightArm: 'Medium Laser',
        leftTorso: 'Improved Weapon Targeting System',
        rightTorso: 'Plasma Lance',
      },
    });

    // Positions from the field map in docs/cards.md: beside the name, Left Arm, Right Torso.
    expect(triangles).toEqual([
      { x: 364, y: 15, width: 12, height: 11 },
      { x: 67, y: 455, width: 11, height: 10 },
      { x: 250, y: 484, width: 11, height: 10 },
    ]);
    expect(texts).toContainEqual({ text: 'ILLEGAL: 2 issues', stroked: true });
  });

  it('prints no marks on a Legal card', async () => {
    const { texts, triangles } = await printed(testMech);

    expect(triangles).toEqual([]);
    expect(texts).toContainEqual({ text: 'Ironclad', stroked: false });
    expect(texts.filter(({ text }) => text.includes('ILLEGAL'))).toEqual([]);
  });

  it('prints the triangles and a bold ILLEGAL line on an illegal Vehicle card', async () => {
    const { texts, triangles } = await printed({
      ...testVehicle,
      staticMount: true,
      cargoBays: 0,
      mounts: { turret: 'Light Laser', staticMount1: 'Plasma Lance', staticMount2: null },
    });

    // Positions from the field map in docs/cards.md: beside the name, the second mount row.
    expect(triangles).toEqual([
      { x: 364, y: 15, width: 12, height: 11 },
      { x: 217, y: 477, width: 11, height: 10 },
    ]);
    expect(texts).toContainEqual({ text: 'ILLEGAL: 2 issues', stroked: true });
    expect(texts).toContainEqual({ text: 'Static: Plasma Lance', stroked: false });
  });
});
