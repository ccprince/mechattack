import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { VehicleProfile } from '../domain/vehicle';
import { createValueMeasure, loadCardFonts } from './fonts';
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

describe('buildVehicleCardSvg', () => {
  it('replaces the sample data with a Legal Vehicle, unmarked', () => {
    const svg = buildVehicleCardSvg(testVehicle, createValueMeasure());
    expect(field(svg, 'name')?.textContent).toBe('Hellhound');
    // Worked out from the Light Frame: 20 Armor, a Light Laser and a Cargo Bay.
    expect(field(svg, 'bp')?.textContent).toBe('4');
    expect(field(svg, 'type')?.textContent).toBe('Light');
    expect(field(svg, 'mv')?.textContent).toBe('4');
    expect(field(svg, 'tp')?.textContent).toBe('4');
    expect(field(svg, 'armor')?.textContent).toBe('20');
    expect(field(svg, 'mount1-weapon')?.textContent).toBe('Turret: Lt Laser');
    expect(field(svg, 'mount1-rv')?.textContent).toBe('6/10');
    expect(field(svg, 'mount2-weapon')).toBeNull();
    expect(field(svg, 'mount2-rv')).toBeNull();
    expect(lines(svg, 'cargo-bays')).toEqual(['Cargo Bay ×1']);
    expect(lines(svg, 'notes')).toEqual(['Amphibious. Smoke launchers (1/game).']);
    expect(field(svg, 'illegal')).toBeNull();
    expect(marks(svg)).toEqual([]);
    expect(svg.querySelector('style')?.textContent).not.toContain('@import');

    // Armor 20 crosses out rows 60…30.
    const crossed = svg.querySelector('#data rect.crossed');
    expect(crossed?.getAttribute('y')).toBe('90');
    expect(crossed?.getAttribute('height')).toBe('80');
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
    expect(field(svg, 'mount1-weapon')?.textContent).toBe('Turret: Md Laser-TL');
    expect(field(svg, 'mount2-weapon')?.textContent).toBe('Static: Plasma Lance');
    expect(field(svg, 'mount2-rv')).toBeNull();
    expect(lines(svg, 'notes')).toHaveLength(8);
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

  it.each([
    { size: 'large', scale: 1 },
    { size: 'sleeve', scale: 2.5 / 3.9 },
  ])('keeps text and marks inside their boxes at $size size', async ({ size, scale }) => {
    for (const [legality, profile] of [
      ['legal', legalStaticMount],
      ['illegal', illegalVehicle],
    ] as const) {
      const svg = buildVehicleCardSvg(profile, createValueMeasure());
      svg.setAttribute('width', `${3.9 * scale}in`);
      svg.setAttribute('height', `${5.1 * scale}in`);
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
        // The rows sit under the labels at y 435, one above the other, and clear of the Rv column.
        const top = card.top + (435 + row * 31.5) * toViewBox;
        const bottom = top + 31.5 * toViewBox;
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
