import { describe, expect, it } from 'vitest';
import { armorCrossOut, hatchLines, strengthCrossOut } from './geometry';

describe('armorCrossOut', () => {
  it('crosses out every Mech armor row above the starting Armor', () => {
    expect(armorCrossOut(110, 150)).toEqual({ x: 12, y: 90, width: 238, height: 80 });
  });

  it('crosses out nothing at full Armor', () => {
    expect(armorCrossOut(150, 150)).toBeNull();
  });

  it('crosses out the whole grid but one row at the lowest Armor', () => {
    expect(armorCrossOut(10, 60)).toEqual({ x: 12, y: 90, width: 238, height: 100 });
  });

  it('spans the armor-value column as well as the cells, so the value is struck too', () => {
    const block = armorCrossOut(140, 150)!;
    expect(block.x).toBe(12);
    expect(block.x + block.width).toBe(250);
  });
});

describe('hatchLines', () => {
  const block = { x: 0, y: 0, width: 20, height: 10 };

  it('runs every line at 45° from top-left to bottom-right', () => {
    for (const { x1, y1, x2, y2 } of hatchLines(block)) {
      expect(x2 - x1).toBeCloseTo(y2 - y1);
      expect(x2).toBeGreaterThan(x1);
    }
  });

  it('keeps every line inside the block', () => {
    for (const { x1, y1, x2, y2 } of hatchLines(block)) {
      expect(Math.min(x1, x2)).toBeGreaterThanOrEqual(block.x);
      expect(Math.min(y1, y2)).toBeGreaterThanOrEqual(block.y);
      expect(Math.max(x2, x1)).toBeLessThanOrEqual(block.x + block.width);
      expect(Math.max(y2, y1)).toBeLessThanOrEqual(block.y + block.height);
    }
  });

  it('spaces the lines evenly across the block, corner to corner', () => {
    const lines = hatchLines(block, 5);
    // Offsets -5, 0, 5, 10, 15: the first enters on the left edge, the rest on the top.
    expect(lines).toEqual([
      { x1: 0, y1: 5, x2: 5, y2: 10 },
      { x1: 0, y1: 0, x2: 10, y2: 10 },
      { x1: 5, y1: 0, x2: 15, y2: 10 },
      { x1: 10, y1: 0, x2: 20, y2: 10 },
      { x1: 15, y1: 0, x2: 20, y2: 5 },
    ]);
  });

  it('hatches a block narrower than the spacing at all', () => {
    expect(hatchLines({ x: 0, y: 0, width: 3, height: 3 }, 6).length).toBeGreaterThan(0);
  });
});

describe('strengthCrossOut', () => {
  it('crosses out boxes 6–10 and all of row 1 at Sv 5', () => {
    expect(strengthCrossOut(5)).toEqual([
      { x: 131, y: 68, width: 119, height: 20.5 },
      { x: 12, y: 88.5, width: 238, height: 20.5 },
    ]);
  });

  it('crosses out row 1 at Sv 10', () => {
    expect(strengthCrossOut(10)).toEqual([{ x: 12, y: 88.5, width: 238, height: 20.5 }]);
  });
});
