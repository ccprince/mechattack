import { beforeAll, describe, expect, it } from 'vitest';
import type { UnitProfile } from '../domain/unitProfile';
import { createValueMeasure, loadCardFonts } from './fonts';
import { testMech } from './testMech';
import { testTroop } from './testTroop';
import { testVehicle } from './testVehicle';
import { buildUnitCardSvg } from './unitCard';

beforeAll(loadCardFonts);

/** The corner is identical on all three cards, so every case runs against all three. */
const legal: Record<string, UnitProfile> = {
  Mech: testMech,
  Vehicle: testVehicle,
  Troop: testTroop,
};
/** Each kind made illegal the same way: a Weapon heavier than the unit's Class. */
const illegal: Record<string, UnitProfile> = {
  Mech: { ...testMech, class: 'Light' },
  Vehicle: { ...testVehicle, mounts: { ...testVehicle.mounts, turret: 'Heavy Laser' } },
  Troop: { ...testTroop, crewServedWeapon: 'Heavy Laser' },
};

function copy(svg: SVGSVGElement) {
  return svg.querySelector<SVGTextElement>('[data-field="copy"]');
}

function triangle(svg: SVGSVGElement) {
  return svg.querySelector<SVGGElement>('[data-mark="illegal"]');
}

/** Renders a card in the page so laid-out geometry can be measured. */
function render(profile: UnitProfile, copyNumber?: number): SVGSVGElement {
  const svg = buildUnitCardSvg(profile, createValueMeasure(), copyNumber);
  document.body.append(svg);
  return svg;
}

describe.each(Object.keys(legal))('the name row corner on a %s card', (kind) => {
  it('prints no Copy Number when the card is the only one of its name', () => {
    const svg = render(legal[kind]!);
    expect(copy(svg)).toBeNull();
    svg.remove();
  });

  it('prints the Copy Number in parentheses', () => {
    const svg = render(legal[kind]!, 2);
    expect(copy(svg)?.textContent).toBe('(2)');
    svg.remove();
  });

  it('puts a Copy Number alone in the corner', () => {
    const svg = render(legal[kind]!, 2);
    const box = copy(svg)!.getBBox();
    expect(box.x + box.width).toBeCloseTo(376, 0);
    svg.remove();
  });

  it('leaves the triangle in the corner and shifts the Copy Number left of it', () => {
    const svg = render(illegal[kind]!, 2);
    const mark = triangle(svg)!.getBBox();
    const box = copy(svg)!.getBBox();
    expect(mark.x + mark.width).toBeCloseTo(376, 0);
    expect(box.x + box.width).toBeCloseTo(360, 0);
    expect(box.x + box.width).toBeLessThan(mark.x);
    svg.remove();
  });

  it('still prints the triangle when there is no Copy Number', () => {
    const svg = render(illegal[kind]!);
    const mark = triangle(svg)!.getBBox();
    expect(copy(svg)).toBeNull();
    expect(mark.x + mark.width).toBeCloseTo(376, 0);
    svg.remove();
  });

  it('keeps the widest Copy Number clear of the NAME label and inside the card', () => {
    const svg = render(illegal[kind]!, 100);
    const box = copy(svg)!.getBBox();
    const label = Array.from(svg.querySelectorAll('text.lbl')).find(
      (text) => text.textContent === 'NAME:',
    )!;
    const labelBox = (label as SVGTextElement).getBBox();
    expect(box.x).toBeGreaterThan(labelBox.x + labelBox.width);
    expect(box.x + box.width).toBeLessThanOrEqual(378);
    svg.remove();
  });

  it('never overlaps the name value', () => {
    const svg = render(legal[kind]!, 2);
    const box = copy(svg)!.getBBox();
    const name = svg.querySelector<SVGTextElement>('[data-field="name"]')!.getBBox();
    expect(box.y + box.height).toBeLessThanOrEqual(name.y);
    svg.remove();
  });
});
