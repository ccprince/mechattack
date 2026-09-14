import { beforeAll, describe, expect, it } from 'vitest';
import { sampleMech } from '../domain/mech';
import { createValueMeasure, loadCardFonts } from './fonts';
import { buildMechCardSvg } from './mechCard';

beforeAll(loadCardFonts);

function field(svg: SVGSVGElement, name: string) {
  return svg.querySelector<SVGTextElement>(`[data-field="${name}"]`);
}

describe('buildMechCardSvg', () => {
  it('replaces the sample data with the Unit Profile', () => {
    const svg = buildMechCardSvg(sampleMech, createValueMeasure());
    expect(field(svg, 'name')?.textContent).toBe('Ironclad');
    expect(field(svg, 'armor')?.textContent).toBe('110');
    expect(field(svg, 'la-weapon')?.textContent).toBe('AC');
    expect(field(svg, 'la-rv')?.textContent).toBe('12/24');
    expect(field(svg, 'rt-rv')).toBeNull();
    expect(svg.querySelectorAll('#data rect.crossed')).toHaveLength(1);
  });

  it('removes the Google Fonts import', () => {
    const svg = buildMechCardSvg(sampleMech, createValueMeasure());
    expect(svg.querySelector('style')?.textContent).not.toContain('@import');
  });

  it('keeps a long name inside its box in the real value font', async () => {
    const measure = createValueMeasure();
    const svg = buildMechCardSvg(
      { ...sampleMech, name: 'Annihilator Prime Mk. IV Siege Variant' },
      measure,
    );
    document.body.append(svg);
    const name = field(svg, 'name')!;
    expect(name.getComputedTextLength()).toBeLessThanOrEqual(116.5);
    svg.remove();
  });
});
