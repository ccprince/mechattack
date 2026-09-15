import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { MechProfile } from '../domain/mech';
import { testMech } from './testMech';
import { createValueMeasure, loadCardFonts } from './fonts';
import { buildMechCardSvg } from './mechCard';

beforeAll(loadCardFonts);

const longNotes = Array.from({ length: 40 }, (_, i) => `Note ${i + 1}.`).join(' ');

function field(svg: SVGSVGElement, name: string) {
  return svg.querySelector<SVGTextElement>(`[data-field="${name}"]`);
}

/** A wrapped field's lines, one per `<tspan>`. */
function lines(svg: SVGSVGElement, name: string): string[] {
  const tspans = field(svg, name)?.querySelectorAll('tspan') ?? [];
  return Array.from(tspans, (tspan) => tspan.textContent ?? '');
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function marks(svg: SVGSVGElement): string[] {
  return Array.from(svg.querySelectorAll('[data-mark]'), (mark) => mark.getAttribute('data-mark')!);
}

describe('buildMechCardSvg', () => {
  it('replaces the sample data with the Unit Profile', () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
    expect(field(svg, 'name')?.textContent).toBe('Ironclad');
    // Worked out from the Heavy Frame: 70 Armor, 1 Heat Sink, 1 Engine Upgrade, 8 Bp of mounts.
    expect(field(svg, 'bp')?.textContent).toBe('19');
    expect(field(svg, 'mv')?.textContent).toBe('4');
    expect(field(svg, 'tp')?.textContent).toBe('3');
    expect(field(svg, 'hc')?.textContent).toBe('5');
    expect(field(svg, 'armor')?.textContent).toBe('70');
    expect(field(svg, 'ra-weapon')?.textContent).toBe('Hv Laser');
    expect(field(svg, 'ra-rv')?.textContent).toBe('6/10');
    expect(field(svg, 'ra-hv')?.textContent).toBe('2');
    expect(field(svg, 'rt-rv')).toBeNull();
    expect(svg.querySelectorAll('#data rect.crossed')).toHaveLength(1);
  });

  it('prints a minimum Rv ahead of the normal and extended Rv', () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
    expect(field(svg, 'la-weapon')?.textContent).toBe('Hv Missile');
    expect(field(svg, 'la-rv')?.textContent).toBe('3-10/14');
  });

  it('leaves Hv blank for an entry that generates no heat', () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
    expect(field(svg, 'lt-weapon')?.textContent).toBe('IWTS');
    expect(field(svg, 'lt-rv')?.textContent).toBe('8/12');
    expect(field(svg, 'lt-hv')?.textContent ?? '').toBe('');
  });

  it('leaves Rv blank for Support Equipment without range', () => {
    const svg = buildMechCardSvg(
      {
        ...testMech,
        hardpoints: { ...testMech.hardpoints, rightTorso: 'Electronic Counter Targeting System' },
      },
      createValueMeasure(),
    );
    expect(field(svg, 'rt-weapon')?.textContent).toBe('ECTS');
    expect(field(svg, 'rt-rv')?.textContent ?? '').toBe('');
    expect(field(svg, 'rt-hv')?.textContent).toBe('1');
  });

  it('removes the Google Fonts import', () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
    expect(svg.querySelector('style')?.textContent).not.toContain('@import');
  });

  it('prints no illegal marks on a Legal card', () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
    expect(svg.querySelectorAll('[data-mark]')).toHaveLength(0);
    expect(field(svg, 'illegal')).toBeNull();
    expect(field(svg, 'notes')?.getAttribute('y')).toBe('260');
  });

  describe('on an illegal card', () => {
    const illegalMech: MechProfile = {
      ...testMech,
      class: 'Medium',
      // Kept within the Medium Frame's Bp, so only the mounts have Issues.
      armor: 0,
      notes: longNotes,
      hardpoints: {
        leftArm: 'Heavy Missile',
        rightArm: 'Medium Laser',
        leftTorso: 'Improved Weapon Targeting System',
        rightTorso: 'Plasma Lance',
      },
    };

    it('marks the name and each Hardpoint row with an Issue', () => {
      const svg = buildMechCardSvg(illegalMech, createValueMeasure());
      expect(marks(svg)).toEqual(['illegal', 'la-illegal', 'rt-illegal']);
    });

    it('heads the notes with the count of Issues', () => {
      const svg = buildMechCardSvg(illegalMech, createValueMeasure());
      expect(lines(svg, 'illegal').join(' ')).toBe('ILLEGAL: 2 issues');
    });

    it('names a single Issue', () => {
      const svg = buildMechCardSvg(
        { ...illegalMech, hardpoints: { ...illegalMech.hardpoints, rightTorso: null } },
        createValueMeasure(),
      );
      expect(lines(svg, 'illegal').join(' ')).toBe('ILLEGAL: Hv Missile too heavy');
      expect(marks(svg)).toEqual(['illegal', 'la-illegal']);
    });

    it('marks an Issue that belongs to no Hardpoint only beside the name', () => {
      const svg = buildMechCardSvg({ ...testMech, heatSinks: 2 }, createValueMeasure());
      expect(marks(svg)).toEqual(['illegal']);
      expect(lines(svg, 'illegal').join(' ')).toBe('ILLEGAL: Bp over max');
    });

    it('keeps the notes inside their box below the ILLEGAL line', () => {
      const svg = buildMechCardSvg(illegalMech, createValueMeasure());
      document.body.append(svg);
      const notes = field(svg, 'notes')!.getBBox();
      const illegal = field(svg, 'illegal')!.getBBox();
      svg.remove();

      expect(notes.y).toBeGreaterThanOrEqual(illegal.y + illegal.height);
      expect(notes.y + notes.height).toBeLessThanOrEqual(422);
      expect(notes.x + notes.width).toBeLessThanOrEqual(378);
      expect(lines(svg, 'notes')).toHaveLength(11);
    });

    it.each([
      { size: 'large', scale: 1 },
      { size: 'sleeve', scale: 2.5 / 3.9 },
    ])('keeps every mark legible and clear of the text at $size size', async ({ size, scale }) => {
      // A mark on every Hardpoint, beside the longest short name, under a name that fills its box.
      const crowdedMech: MechProfile = {
        ...illegalMech,
        name: 'Annihilator Prime Mk. IV Siege Variant',
        class: 'Light',
        hardpoints: {
          leftArm: 'Heavy Machine Gun (w/Armor Piercing Ammo)',
          rightArm: 'Medium Machine Gun (w/Armor Piercing Ammo)',
          leftTorso: 'Improved Weapon Targeting System',
          rightTorso: 'Plasma Lance',
        },
      };
      const svg = buildMechCardSvg(crowdedMech, createValueMeasure());
      svg.setAttribute('width', `${3.9 * scale}in`);
      svg.setAttribute('height', `${5.1 * scale}in`);
      document.body.append(svg);
      // Written to disk for inspection by eye (gitignored).
      await page.screenshot({ element: svg, path: `../../test-output/illegal-card-${size}.png` });

      const card = svg.getBoundingClientRect();
      const texts = Array.from(svg.querySelectorAll('text'), (text) =>
        text.getBoundingClientRect(),
      );
      const markRects = Array.from(svg.querySelectorAll('[data-mark]'), (mark) =>
        mark.getBoundingClientRect(),
      );
      svg.remove();

      expect(marks(svg)).toEqual([
        'illegal',
        'la-illegal',
        'ra-illegal',
        'lt-illegal',
        'rt-illegal',
      ]);
      for (const mark of markRects) {
        expect(mark.left).toBeGreaterThanOrEqual(card.left);
        expect(mark.right).toBeLessThanOrEqual(card.right);
        expect(mark.top).toBeGreaterThanOrEqual(card.top);
        expect(mark.bottom).toBeLessThanOrEqual(card.bottom);
        // 11 viewBox units, about 0.07" even at Sleeve size.
        expect(mark.width).toBeGreaterThanOrEqual(6.5);
        expect(texts.filter((text) => overlaps(mark, text))).toEqual([]);
      }
    });
  });

  it('keeps a long name inside its box in the real value font', async () => {
    const measure = createValueMeasure();
    const svg = buildMechCardSvg(
      { ...testMech, name: 'Annihilator Prime Mk. IV Siege Variant' },
      measure,
    );
    document.body.append(svg);
    const name = field(svg, 'name')!;
    expect(name.getComputedTextLength()).toBeLessThanOrEqual(116.5);
    svg.remove();
  });
});
