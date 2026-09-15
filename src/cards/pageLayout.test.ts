import { describe, expect, it } from 'vitest';
import { placeCards, slotRect } from './pageLayout';

describe('slotRect', () => {
  it('centers the Large grid with 0.25" / 0.3" margins', () => {
    const first = slotRect('large', 0);
    expect(first.x).toBeCloseTo(0.25);
    expect(first.y).toBeCloseTo(0.3);
    expect(first.width).toBe(3.9);
    expect(first.height).toBe(5.1);
    const last = slotRect('large', 3);
    expect(last.x).toBeCloseTo(4.35);
    expect(last.y).toBeCloseTo(5.6);
  });

  it('scales Sleeve slots to 2.5" wide with 0.35" / 0.445" margins', () => {
    const first = slotRect('sleeve', 0);
    expect(first.width).toBeCloseTo(2.5);
    expect(first.height).toBeCloseTo(3.27, 2);
    expect(first.x).toBeCloseTo(0.35);
    expect(first.y).toBeCloseTo(0.445, 2);
  });
});

describe('placeCards', () => {
  it('stacks two Troops in one Large slot with a 0.1" gap', () => {
    const [top, bottom] = placeCards(['Troop', 'Troop'], 'large');
    expect(top).toEqual({
      page: 0,
      rect: { x: expect.closeTo(0.25), y: expect.closeTo(0.3), width: 3.9, height: 2.5 },
    });
    expect(bottom?.page).toBe(0);
    expect(bottom?.rect.x).toBeCloseTo(0.25);
    expect(bottom?.rect.y).toBeCloseTo(0.3 + 2.5 + 0.1);
    expect(bottom?.rect.height).toBe(2.5);
  });

  it('stacks two Troops in one Sleeve slot with a 0.064" gap', () => {
    const [top, bottom] = placeCards(['Troop', 'Troop'], 'sleeve');
    expect(top?.rect.width).toBeCloseTo(2.5);
    expect(top?.rect.height).toBeCloseTo(1.6, 2);
    expect(bottom!.rect.y - (top!.rect.y + top!.rect.height)).toBeCloseTo(0.064, 3);
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
    expect(troop).toEqual({ page: 0, rect: { ...slotRect('large', 1), height: 2.5 } });
  });

  it('starts a new page when the slots fill, Troops counting half a slot', () => {
    const kinds = ['Vehicle', 'Mech', 'Troop', 'Troop', 'Mech', 'Troop', 'Troop'] as const;
    expect(placeCards(kinds, 'large').map(({ page }) => page)).toEqual([0, 0, 0, 0, 0, 1, 1]);
    expect(placeCards(Array(10).fill('Mech'), 'sleeve').at(-1)).toEqual({
      page: 1,
      rect: slotRect('sleeve', 0),
    });
  });
});
