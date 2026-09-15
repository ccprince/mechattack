import { beforeAll, describe, expect, it } from 'vitest';
import { testMech } from './testMech';
import { createValueMeasure, loadCardFonts } from './fonts';
import { buildMechCardSvg } from './mechCard';

beforeAll(loadCardFonts);

function field(svg: SVGSVGElement, name: string) {
  return svg.querySelector<SVGTextElement>(`[data-field="${name}"]`);
}

describe('buildMechCardSvg', () => {
  it('replaces the sample data with the Unit Profile', () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
    expect(field(svg, 'name')?.textContent).toBe('Ironclad');
    expect(field(svg, 'armor')?.textContent).toBe('110');
    expect(field(svg, 'ra-weapon')?.textContent).toBe('HL');
    expect(field(svg, 'ra-rv')?.textContent).toBe('6/10');
    expect(field(svg, 'ra-hv')?.textContent).toBe('2');
    expect(field(svg, 'rt-rv')).toBeNull();
    expect(svg.querySelectorAll('#data rect.crossed')).toHaveLength(1);
  });

  it('prints a minimum Rv ahead of the normal and extended Rv', () => {
    const svg = buildMechCardSvg(testMech, createValueMeasure());
    expect(field(svg, 'la-weapon')?.textContent).toBe('HM');
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
