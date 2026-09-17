import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { catalog } from '../domain/catalog';
import type { VehicleProfile } from '../domain/vehicle';
import { createValueMeasure, loadCardFonts } from './fonts';
import { printedCardSize, printSizes } from './pageLayout';
import { testVehicle } from './testVehicle';
import { buildVehicleCardSvg } from './vehicleCard';

beforeAll(loadCardFonts);

function field(svg: SVGSVGElement, name: string) {
  return svg.querySelector<SVGTextElement>(`[data-field="${name}"]`);
}

function lines(svg: SVGSVGElement, name: string): string[] {
  const tspans = field(svg, name)?.querySelectorAll('tspan') ?? [];
  return Array.from(tspans, (tspan) => tspan.textContent ?? '');
}

function marks(svg: SVGSVGElement): string[] {
  return Array.from(svg.querySelectorAll('[data-mark]'), (mark) => mark.getAttribute('data-mark')!);
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** The boxes of one mount row's drawn Dp, in paint order. */
function dpBoxes(svg: SVGSVGElement, row: string) {
  return Array.from(svg.querySelectorAll(`[data-dp="${row}"] rect`), (box) => ({
    x: Number(box.getAttribute('x')),
    y: Number(box.getAttribute('y')),
    size: Number(box.getAttribute('width')),
    fill: box.getAttribute('fill'),
  }));
}

function dpRows(svg: SVGSVGElement): string[] {
  return Array.from(svg.querySelectorAll('[data-dp]'), (group) => group.getAttribute('data-dp')!);
}

describe('buildVehicleCardSvg', () => {
  describe('Dp', () => {
    it('draws the Weapon’s Dp on its mount row, and nothing for Support Equipment', () => {
      const svg = buildVehicleCardSvg(
        {
          ...testVehicle,
          class: 'Medium',
          turret: true,
          staticMount: true,
          cargoBays: 0,
          mounts: {
            turret: 'Light Laser',
            staticMount1: 'Remote Guided Missile System',
            staticMount2: null,
          },
        },
        createValueMeasure(),
      );
      expect(dpRows(svg)).toEqual(['mount1']);
      // The Light Laser's 111, black on the Impact Box.
      const boxes = dpBoxes(svg, 'mount1');
      expect(boxes).toHaveLength(3);
      expect(boxes.map((box) => box.fill)).toEqual(['#000', '#888', '#888']);
      for (const { x, y, size } of boxes) {
        expect(x).toBeGreaterThanOrEqual(320);
        expect(x + size).toBeLessThanOrEqual(378);
        expect(y).toBeGreaterThanOrEqual(435);
        expect(y + size).toBeLessThanOrEqual(484);
      }
    });

    it('keeps a Weapon too heavy for the 4×4 grid inside its mount row', () => {
      // A Heavy Laser is 5 rows; only an illegal Vehicle mounts one.
      const svg = buildVehicleCardSvg(
        { ...testVehicle, mounts: { ...testVehicle.mounts, turret: 'Heavy Laser' } },
        createValueMeasure(),
      );
      const boxes = dpBoxes(svg, 'mount1');
      expect(boxes).toHaveLength(5);
      // The mount row is tall enough for 5 rows, so it keeps the card's box size.
      expect(boxes[0]!.size).toBeCloseTo(7.75 / 1.2);
      expect(marks(svg)).toContain('mount1-illegal');
      for (const { y, size } of boxes) {
        expect(y).toBeGreaterThanOrEqual(435);
        expect(y + size).toBeLessThanOrEqual(484);
      }
    });
  });

  it('replaces the sample data with a Legal Vehicle, unmarked', () => {
    const svg = buildVehicleCardSvg(testVehicle, createValueMeasure());
    expect(field(svg, 'name')?.textContent).toBe('Hellhound');
    // Worked out from the Light Frame: 20 Armor, a Light Laser and a Cargo Bay.
    expect(field(svg, 'bp')?.textContent).toBe('4');
    expect(field(svg, 'type')?.textContent).toBe('Light');
    expect(field(svg, 'mv')?.textContent).toBe('4');
    expect(field(svg, 'tp')?.textContent).toBe('4');
    expect(field(svg, 'armor')?.textContent).toBe('20');
    expect(lines(svg, 'mount1-weapon')).toEqual(['Turret: Light Laser']);
    expect(field(svg, 'mount1-rv')?.textContent).toBe('6/10');
    expect(field(svg, 'mount2-weapon')).toBeNull();
    expect(field(svg, 'mount2-rv')).toBeNull();
    expect(lines(svg, 'cargo-bays')).toEqual(['Cargo Bay ×1']);
    expect(lines(svg, 'notes')).toEqual(['Amphibious. Smoke launchers (1/game).']);
    expect(field(svg, 'illegal')).toBeNull();
    expect(marks(svg)).toEqual([]);
    expect(svg.querySelector('style')?.textContent).not.toContain('@import');
    expect(svg.getAttribute('viewBox')).toBe('0 0 390 546');

    // Armor 20 crosses out rows 60…30, across the armor values as well as the cells.
    const crossed = svg.querySelector('#data rect.crossed');
    expect(crossed?.getAttribute('y')).toBe('90');
    expect(crossed?.getAttribute('height')).toBe('80');
    expect(crossed?.getAttribute('x')).toBe('12');
    expect(crossed?.getAttribute('width')).toBe('238');

    // The block is hatched, not crossed with an X: many 45° lines, none of them back-slanted.
    const hatch = svg.querySelector('#data path');
    const segments = hatch?.getAttribute('d')?.split('M').filter(Boolean) ?? [];
    expect(segments.length).toBeGreaterThan(20);
    expect(hatch?.getAttribute('stroke-width')).toBe('1.1');
  });

  const illegalVehicle: VehicleProfile = {
    ...testVehicle,
    name: 'Juggernaut Heavy Assault Carrier',
    armor: 0,
    staticMount: true,
    cargoBays: 0,
    notes: Array.from({ length: 120 }, (_, i) => `Note ${i + 1}.`).join(' '),
    mounts: {
      turret: 'Medium Laser (Twin Linked)',
      staticMount1: 'Plasma Lance',
      staticMount2: 'Light Machine Gun',
    },
  };

  it('marks an illegal Vehicle beside the name and on each mount row with an Issue', () => {
    const svg = buildVehicleCardSvg(illegalVehicle, createValueMeasure());
    expect(marks(svg)).toEqual(['illegal', 'mount1-illegal', 'mount2-illegal']);
    expect(lines(svg, 'illegal').join(' ')).toBe('ILLEGAL: 3 issues');
    // Too long for one line, so it wraps at full size rather than shrinking away.
    expect(lines(svg, 'mount1-weapon')).toHaveLength(2);
    expect(lines(svg, 'mount1-weapon').join(' ')).toBe('Turret: Medium Laser (Twin Linked)');
    expect(field(svg, 'mount1-weapon')?.style.fontSize).toBe('14px');
    expect(lines(svg, 'mount2-weapon')).toEqual(['Static: Plasma Lance']);
    expect(field(svg, 'mount2-rv')).toBeNull();
    expect(lines(svg, 'notes')).toHaveLength(8);
  });

  it('prints every Catalog name a Vehicle may mount in full on its mount row', () => {
    const measure = createValueMeasure();
    // A Medium Vehicle may mount Light and Medium entries, so its rows are unmarked.
    for (const entry of catalog.filter((entry) => entry.class !== 'Heavy')) {
      const svg = buildVehicleCardSvg(
        {
          ...testVehicle,
          class: 'Medium',
          turret: false,
          staticMount: true,
          cargoBays: 0,
          mounts: { turret: null, staticMount1: entry.name, staticMount2: null },
        },
        measure,
      );
      expect(lines(svg, 'mount1-weapon').join(' ')).toBe(`Static: ${entry.name}`);
    }
  });

  // Legal with both Static Mount slots filled: 6 of the Medium Frame's 6 Bp.
  const legalStaticMount: VehicleProfile = {
    ...testVehicle,
    class: 'Medium',
    armor: 30,
    turret: false,
    staticMount: true,
    cargoBays: 0,
    mounts: {
      turret: null,
      staticMount1: 'Medium Laser',
      staticMount2: 'Remote Guided Missile System',
    },
  };

  it.each(printSizes)('keeps text and marks inside their boxes at %s size', async (size) => {
    for (const [legality, profile] of [
      ['legal', legalStaticMount],
      ['illegal', illegalVehicle],
    ] as const) {
      const svg = buildVehicleCardSvg(profile, createValueMeasure());
      const printed = printedCardSize('Vehicle', size);
      svg.setAttribute('width', `${printed.width}in`);
      svg.setAttribute('height', `${printed.height}in`);
      document.body.append(svg);
      // Written to disk for inspection by eye (gitignored).
      await page.screenshot({
        element: svg,
        path: `../../test-output/vehicle-card-${legality}-${size}.png`,
      });

      const card = svg.getBoundingClientRect();
      const toViewBox = card.width / 390;
      const box = (el: Element | null) => el!.getBoundingClientRect();
      const texts = Array.from(svg.querySelectorAll('#data text'), (text) =>
        text.getBoundingClientRect(),
      );
      const markRects = Array.from(svg.querySelectorAll('[data-mark]'), (mark) =>
        mark.getBoundingClientRect(),
      );
      const notesBottom = box(field(svg, 'notes')).bottom;
      const rows = [1, 2].map((row) => [
        field(svg, `mount${row}-weapon`)?.getBoundingClientRect(),
        field(svg, `mount${row}-rv`)?.getBoundingClientRect(),
      ]);
      svg.remove();

      expect(notesBottom).toBeLessThanOrEqual(card.top + 400 * toViewBox);
      for (const [row, [weapon, rv]] of rows.entries()) {
        if (!weapon) continue;
        // The rows sit under the labels, 435–484 and 484–534, and clear of the Rv column.
        const top = card.top + [435, 484][row]! * toViewBox;
        const bottom = card.top + [484, 534][row]! * toViewBox;
        for (const rect of [weapon, rv]) {
          if (!rect) continue;
          expect(rect.top).toBeGreaterThanOrEqual(top);
          expect(rect.bottom).toBeLessThanOrEqual(bottom);
        }
        expect(weapon.right).toBeLessThanOrEqual(card.left + 232 * toViewBox);
      }
      for (const mark of markRects) {
        expect(mark.left).toBeGreaterThanOrEqual(card.left);
        expect(mark.right).toBeLessThanOrEqual(card.right);
        expect(mark.width).toBeGreaterThanOrEqual(6.5);
        expect(texts.filter((text) => overlaps(mark, text))).toEqual([]);
      }
    }
  });
});
