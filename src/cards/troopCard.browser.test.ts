import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { TroopProfile } from '../domain/troop';
import { createValueMeasure, loadCardFonts } from './fonts';
import { printedCardSize, printSizes } from './pageLayout';
import { testTroop } from './testTroop';
import { buildTroopCardSvg } from './troopCard';

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

/** The boxes of the Crew Served Weapon's drawn Dp, in paint order. */
function dpBoxes(svg: SVGSVGElement) {
  return Array.from(svg.querySelectorAll('[data-dp="weapon"] rect'), (box) => ({
    x: Number(box.getAttribute('x')),
    y: Number(box.getAttribute('y')),
    size: Number(box.getAttribute('width')),
    fill: box.getAttribute('fill'),
  }));
}

describe('buildTroopCardSvg', () => {
  describe('Dp', () => {
    it('draws the Crew Served Weapon’s Dp inside its area', () => {
      const svg = buildTroopCardSvg(testTroop, createValueMeasure());
      // The Light Missile's 3: one row, black in the center.
      const boxes = dpBoxes(svg);
      expect(boxes.map((box) => box.fill)).toEqual(['#888', '#000', '#888']);
      for (const { x, y, size } of boxes) {
        expect(x).toBeGreaterThanOrEqual(214);
        expect(x + size).toBeLessThanOrEqual(250);
        expect(y).toBeGreaterThanOrEqual(182);
        expect(y + size).toBeLessThanOrEqual(238);
      }
    });

    it('draws nothing for Support Equipment, an empty mount or a name missing from the Catalog', () => {
      for (const crewServedWeapon of ['Anti-Missile Defense System', null, 'Plasma Lance']) {
        const svg = buildTroopCardSvg({ ...testTroop, crewServedWeapon }, createValueMeasure());
        expect(svg.querySelectorAll('[data-dp]')).toHaveLength(0);
      }
    });

    it('shrinks a Weapon too heavy for the 3×3 area rather than clipping it', () => {
      // A Heavy Missile's 51 is 5 boxes wide, past the area's 3; only an illegal Troop mounts one.
      const svg = buildTroopCardSvg(
        { ...testTroop, crewServedWeapon: 'Heavy Missile' },
        createValueMeasure(),
      );
      const boxes = dpBoxes(svg);
      expect(boxes).toHaveLength(6);
      expect(boxes[0]!.size).toBeLessThan(12 / 1.2);
      expect(marks(svg)).toContain('weapon-illegal');
      for (const { x, y, size } of boxes) {
        expect(x).toBeGreaterThanOrEqual(214);
        expect(x + size).toBeLessThanOrEqual(250);
        expect(y).toBeGreaterThanOrEqual(182);
        expect(y + size).toBeLessThanOrEqual(238);
      }
    });

    it('writes Rolls left of the shape', () => {
      const svg = buildTroopCardSvg(
        { ...testTroop, crewServedWeapon: 'Light Machine Gun' },
        createValueMeasure(),
      );
      const rolls = field(svg, 'weapon-rolls')!;
      expect(rolls.textContent).toBe('3×');
      document.body.append(svg);
      const text = rolls.getBBox();
      svg.remove();
      expect(text.x).toBeGreaterThanOrEqual(214);
      expect(text.x + text.width).toBeLessThanOrEqual(dpBoxes(svg)[0]!.x);
    });
  });

  it('replaces the sample data with a Legal Troop, unmarked', () => {
    const svg = buildTroopCardSvg(testTroop, createValueMeasure());
    expect(field(svg, 'name')?.textContent).toBe('Rangers');
    // Light Infantry's Base Bp 2 plus the Light Missile's 1.
    expect(field(svg, 'bp')?.textContent).toBe('3');
    expect(field(svg, 'type')?.textContent).toBe('Light Infantry');
    expect(field(svg, 'mv')?.textContent).toBe('3');
    expect(field(svg, 'tp')?.textContent).toBe('4');
    expect(field(svg, 'sv')?.textContent).toBe('5');
    expect(lines(svg, 'weapon')).toEqual(['Light Missile']);
    expect(field(svg, 'rv')?.textContent).toBe('3-10/14');
    expect(lines(svg, 'standard-equipment')).toEqual(['Individual Weapons']);
    expect(lines(svg, 'notes')).toEqual(['Holds the ridge.']);
    expect(field(svg, 'illegal')).toBeNull();
    expect(marks(svg)).toEqual([]);
    expect(svg.querySelector('style')?.textContent).not.toContain('@import');

    // Sv 5 crosses out boxes 6–10 and all of row 1.
    const crossed = Array.from(svg.querySelectorAll('#data rect.crossed'), (rect) =>
      ['x', 'y', 'width', 'height'].map((name) => rect.getAttribute(name)),
    );
    expect(crossed).toEqual([
      ['131', '68', '119', '20.5'],
      ['12', '88.5', '238', '20.5'],
    ]);
  });

  it('prints no Crew Served Weapon row without one', () => {
    const svg = buildTroopCardSvg(
      { ...testTroop, class: 'Heavy Infantry', crewServedWeapon: null },
      createValueMeasure(),
    );
    expect(field(svg, 'weapon')).toBeNull();
    expect(field(svg, 'rv')).toBeNull();
    expect(svg.querySelectorAll('#data rect.crossed')).toHaveLength(1);
  });

  const illegalTroop: TroopProfile = {
    ...testTroop,
    name: 'Grenadier Heavy Weapons Platoon',
    class: 'Jump Infantry',
    crewServedWeapon: 'Medium Machine Gun (w/Armor Piercing Ammo)',
    notes: 'Never printed: the ILLEGAL line and Standard Equipment fill the box.',
  };

  it('marks an illegal Troop beside the name and on the Crew Served Weapon row', () => {
    const svg = buildTroopCardSvg(illegalTroop, createValueMeasure());
    expect(marks(svg)).toEqual(['illegal', 'weapon-illegal']);
    expect(lines(svg, 'illegal')).toEqual(['ILLEGAL: 2 issues']);
    expect(lines(svg, 'standard-equipment')).toEqual(['Individual Weapons, Jump Packs']);
    expect(field(svg, 'notes')).toBeNull();
    // Too long for one line, so it wraps rather than shrinking away.
    expect(lines(svg, 'weapon')).toEqual(['Medium Machine', 'Gun (w/Armor…']);
  });

  // Legal Jump Infantry with long notes and the widest Rv.
  const legalTroop: TroopProfile = {
    ...testTroop,
    name: 'Skyborne Assault Company',
    class: 'Jump Infantry',
    notes: Array.from({ length: 30 }, (_, i) => `Note ${i + 1}.`).join(' '),
  };

  const crowdedIllegalTroop: TroopProfile = {
    ...illegalTroop,
    crewServedWeapon: 'Plasma Lance of the Old Empire',
  };

  it('keeps the Notes box and the Crew Served Weapon row inside their boxes', () => {
    for (const profile of [legalTroop, crowdedIllegalTroop]) {
      const svg = buildTroopCardSvg(profile, createValueMeasure());
      document.body.append(svg);
      const bbox = (name: string) => field(svg, name)?.getBBox();
      const notesBox = ['illegal', 'standard-equipment', 'notes'].flatMap(
        (name) => bbox(name) ?? [],
      );
      const weapon = bbox('weapon')!;
      const rv = bbox('rv');
      const illegal = lines(svg, 'illegal');
      svg.remove();

      if (profile === crowdedIllegalTroop) {
        expect(illegal).toHaveLength(1);
        expect(illegal[0]).toMatch(/^ILLEGAL: Plasma Lance .*…$/);
      }

      // The Notes box spans 12–250 × 113–164.
      for (const rect of notesBox) {
        expect(rect.x + rect.width).toBeLessThanOrEqual(250);
        expect(rect.y + rect.height).toBeLessThanOrEqual(164);
      }
      // The Crew Served Weapon row sits under its labels, clear of the Rv column at x 155.
      expect(weapon.x + weapon.width).toBeLessThanOrEqual(155);
      expect(weapon.y + weapon.height).toBeLessThanOrEqual(238);
      if (rv) {
        expect(rv.x).toBeGreaterThanOrEqual(155);
        expect(rv.x + rv.width).toBeLessThanOrEqual(214);
      }
    }
  });

  it.each(printSizes)('keeps every mark legible and clear of the text at %s size', async (size) => {
    for (const [legality, profile] of [
      ['legal', legalTroop],
      ['illegal', crowdedIllegalTroop],
    ] as const) {
      const svg = buildTroopCardSvg(profile, createValueMeasure());
      const printed = printedCardSize('Troop', size);
      svg.setAttribute('width', `${printed.width}in`);
      svg.setAttribute('height', `${printed.height}in`);
      document.body.append(svg);
      // Written to disk for inspection by eye (gitignored).
      await page.screenshot({
        element: svg,
        path: `../../test-output/troop-card-${legality}-${size}.png`,
      });

      const card = svg.getBoundingClientRect();
      const texts = Array.from(svg.querySelectorAll('#data text'), (text) =>
        text.getBoundingClientRect(),
      );
      const markRects = Array.from(svg.querySelectorAll('[data-mark]'), (mark) =>
        mark.getBoundingClientRect(),
      );
      svg.remove();

      expect(markRects).toHaveLength(legality === 'legal' ? 0 : 2);
      for (const mark of markRects) {
        expect(mark.left).toBeGreaterThanOrEqual(card.left);
        expect(mark.right).toBeLessThanOrEqual(card.right);
        expect(mark.width).toBeGreaterThanOrEqual(6.5);
        expect(texts.filter((text) => overlaps(mark, text))).toEqual([]);
      }
    }
  });
});
