import { describe, expect, it } from 'vitest';
import { placeCards, printedCardSize, slotRect } from './pageLayout';

describe('slotRect', () => {
  it('fits the Large 2 × 2 grid to the page height with 0.25" margins and a 0.2" gutter', () => {
    const first = slotRect('large', 0);
    expect(first.y).toBeCloseTo(0.25);
    expect(first.height).toBeCloseTo(5.15);
    expect(first.width).toBeCloseTo(3.679, 3);
    expect(first.x).toBeCloseTo(0.471, 3);
    const last = slotRect('large', 3);
    expect(last.x).toBeCloseTo(4.35, 3);
    expect(last.y).toBeCloseTo(5.6);
  });

  it('fills a 2.5" × 3.5" sleeve, 3 × 2 with 0.25" gutters and margins', () => {
    const first = slotRect('sleeve', 0);
    expect(first.width).toBeCloseTo(2.5);
    expect(first.height).toBeCloseTo(3.5);
    expect(first.x).toBeCloseTo(0.25);
    expect(first.y).toBeCloseTo(1.875);
    const last = slotRect('sleeve', 5);
    expect(last.x).toBeCloseTo(5.75);
    expect(last.y).toBeCloseTo(5.625);
  });
});

describe('printedCardSize', () => {
  it('prints Mechs and Vehicles to fill a sleeve at Sleeve size', () => {
    for (const kind of ['Mech', 'Vehicle'] as const) {
      const { width, height } = printedCardSize(kind, 'sleeve');
      expect(width).toBeCloseTo(2.5);
      expect(height).toBeCloseTo(3.5);
    }
  });

  it('prints a Troop at the Mech width and the Troop template’s height', () => {
    expect(printedCardSize('Troop', 'sleeve').width).toBeCloseTo(2.5);
    expect(printedCardSize('Troop', 'sleeve').height).toBeCloseTo(1.66, 2);
    expect(printedCardSize('Troop', 'large').width).toBeCloseTo(3.679, 3);
    expect(printedCardSize('Troop', 'large').height).toBeCloseTo(2.443, 3);
  });

  it('prints Large Mechs as big as fit two rows on the page', () => {
    const { width, height } = printedCardSize('Mech', 'large');
    expect(width).toBeCloseTo(3.679, 3);
    expect(height).toBeCloseTo(5.15);
  });
});

describe('placeCards', () => {
  it('stacks two Troops in one Large slot, the spare height between them', () => {
    const [top, bottom] = placeCards(['Troop', 'Troop'], 'large');
    expect(top?.page).toBe(0);
    expect(top?.rect.x).toBeCloseTo(0.471, 3);
    expect(top?.rect.y).toBeCloseTo(0.25);
    expect(top?.rect.width).toBeCloseTo(3.679, 3);
    expect(top?.rect.height).toBeCloseTo(2.443, 3);
    expect(bottom?.page).toBe(0);
    expect(bottom?.rect.x).toBeCloseTo(0.471, 3);
    expect(bottom!.rect.y - (top!.rect.y + top!.rect.height)).toBeCloseTo(0.264, 3);
    expect(bottom!.rect.y + bottom!.rect.height).toBeCloseTo(0.25 + 5.15);
  });

  it('stacks two Troops in one Sleeve slot with a 0.179" gap', () => {
    const [top, bottom] = placeCards(['Troop', 'Troop'], 'sleeve');
    expect(top?.rect.width).toBeCloseTo(2.5);
    expect(top?.rect.height).toBeCloseTo(1.66, 2);
    expect(bottom!.rect.y - (top!.rect.y + top!.rect.height)).toBeCloseTo(0.179, 3);
    expect(bottom!.rect.y + bottom!.rect.height).toBeCloseTo(
      slotRect('sleeve', 0).y + slotRect('sleeve', 0).height,
    );
  });

  it("leaves the other half of an odd Troop's slot empty", () => {
    const placements = placeCards(['Troop', 'Mech', 'Troop'], 'large');
    expect(placements.map(({ rect }) => rect.y)).toEqual([
      slotRect('large', 0).y,
      slotRect('large', 1).y,
      slotRect('large', 2).y,
    ]);
    expect(placements.map(({ rect }) => rect.x)).toEqual([
      slotRect('large', 0).x,
      slotRect('large', 1).x,
      slotRect('large', 2).x,
    ]);
  });

  it('puts a Troop after a Mech in the top half of the next slot', () => {
    const [mech, troop] = placeCards(['Mech', 'Troop'], 'large');
    expect(mech).toEqual({ page: 0, rect: slotRect('large', 0) });
    expect(troop).toEqual({
      page: 0,
      rect: { ...slotRect('large', 1), height: expect.closeTo(2.443, 3) },
    });
  });

  it('starts a new page when the slots fill, Troops counting half a slot', () => {
    const kinds = ['Vehicle', 'Mech', 'Troop', 'Troop', 'Mech', 'Troop', 'Troop'] as const;
    expect(placeCards(kinds, 'large').map(({ page }) => page)).toEqual([0, 0, 0, 0, 0, 1, 1]);
    expect(placeCards(Array(7).fill('Mech'), 'sleeve').at(-1)).toEqual({
      page: 1,
      rect: slotRect('sleeve', 0),
    });
  });
});
