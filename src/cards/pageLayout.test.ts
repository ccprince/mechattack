import { describe, expect, it } from 'vitest';
import { slotRect } from './pageLayout';

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
