import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { createValueMeasure, loadCardFonts } from '../cards/fonts';
import { buildMechCardSvg } from '../cards/mechCard';
import { testMech } from '../cards/testMech';
import { testTroop } from '../cards/testTroop';
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

  it('prints each Weapon’s Dp boxes and its Rolls text', async () => {
    const svg = buildMechCardSvg(
      { ...testMech, hardpoints: { ...testMech.hardpoints, rightArm: 'Heavy Machine Gun' } },
      createValueMeasure(),
    );
    const doc = await exportCardsPdf([{ kind: 'Mech', svg }], 'large');
    const pdf = doc.output();

    // The left arm's Heavy Missile (51) draws 5 gray boxes; its Impact Box and the Heavy Machine
    // Gun's single box are black, and no card artwork is gray-filled.
    expect(pdf.match(/0\.53 g/g)).toHaveLength(5);
    expect(readPdf(pdf).texts.map(({ text }) => text)).toContain('5×');
  });
});

describe('exportArmyListPdf', () => {
  // 11 fielded copies: 3 Large pages (4-up) or 2 Sleeve pages (6-up).
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

  it('prints every fielded copy of a list mixing all three kinds, Troops two to a slot', async () => {
    // 3 Troops, a Mech, 2 Troops and 2 Vehicles fill 6 Large slots over 2 pages, or 1 Sleeve page.
    const mixed: ArmyList = {
      version: 2,
      name: 'Combined Arms',
      bpLimit: 200,
      unitProfiles: [
        { ...testTroop, id: 't1', name: 'Rangers', quantity: 3 },
        { ...testMech, id: 'm1', name: 'Ironclad', quantity: 1 },
        { ...testTroop, id: 't2', name: 'Skyborne', class: 'Jump Infantry', quantity: 2 },
        { ...testTroop, id: 't3', name: 'Parked', quantity: 0 },
        { ...testVehicle, id: 'v1', name: 'Hellhound', quantity: 2 },
      ],
    };
    for (const [size, pages] of [
      ['large', 2],
      ['sleeve', 1],
    ] as const) {
      const doc = await exportArmyListPdf(mixed, size, createValueMeasure());
      const pdf = doc.output();
      await commands.writeFile(`test-output/all-kinds-army-list-${size}.pdf`, btoa(pdf), 'base64');

      expect(doc.getNumberOfPages()).toBe(pages);
      expect(pdf.match(/\/I\d+ Do/g)).toHaveLength(8);
      const names = readPdf(pdf)
        .texts.map(({ text }) => text)
        .filter((text) =>
          ['Rangers', 'Ironclad', 'Skyborne', 'Parked', 'Hellhound'].includes(text),
        );
      expect(names).toEqual([
        'Rangers',
        'Rangers',
        'Rangers',
        'Ironclad',
        'Skyborne',
        'Skyborne',
        'Hellhound',
        'Hellhound',
      ]);
    }
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
      { x: 67, y: 465, width: 11, height: 10 },
      { x: 250, y: 512, width: 11, height: 10 },
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
      { x: 217, y: 505, width: 11, height: 10 },
    ]);
    expect(texts).toContainEqual({ text: 'ILLEGAL: 2 issues', stroked: true });
    expect(texts).toContainEqual({ text: 'Static: Plasma Lance', stroked: false });
  });

  it('prints the triangles and a bold ILLEGAL line on an illegal Troop card', async () => {
    const { texts, triangles } = await printed({ ...testTroop, crewServedWeapon: 'Medium Laser' });

    // Positions from the field map in docs/cards.md: beside the name, the Crew Served Weapon row.
    expect(triangles).toEqual([
      { x: 364, y: 15, width: 12, height: 11 },
      { x: 140, y: 214, width: 11, height: 10 },
    ]);
    expect(texts).toContainEqual({ text: 'ILLEGAL: Md Laser too heavy', stroked: true });
    // The ILLEGAL line uses the short name; the row itself has room for the full one.
    expect(texts).toContainEqual({ text: 'Medium Laser', stroked: false });
  });
});
