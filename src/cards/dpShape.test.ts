import { describe, expect, it } from 'vitest';
import type { Dp } from '../domain/catalog';
import { dpDrawing, type DpArea, type DpBox } from './dpShape';
import type { Measure } from './fitText';

// Every character is half the font size wide, as in fitText.test.ts.
const measure: Measure = (text, fontSize) => text.length * fontSize * 0.5;

/** The Mech card's left-arm Dp area: 5×5 boxes of 5.8 in 29 × 29 (docs/cards.md). */
const mechArea: DpArea = { x: 166, y: 440, width: 29, height: 29, cellSize: 5.8, rollsFontSize: 9 };
/** The Vehicle card's first mount row: 4×4 boxes of 7.75, which a 5-row shape overflows. */
const vehicleArea: DpArea = {
  x: 320,
  y: 435,
  width: 58,
  height: 31,
  cellSize: 7.75,
  rollsFontSize: 11,
};

const bounds = (boxes: DpBox[]) => ({
  left: Math.min(...boxes.map((box) => box.x)),
  right: Math.max(...boxes.map((box) => box.x + box.width)),
  top: Math.min(...boxes.map((box) => box.y)),
  bottom: Math.max(...boxes.map((box) => box.y + box.height)),
});

const dp = (rows: number[], rolls = 1): Dp => ({ rolls, rows });

describe('dpDrawing', () => {
  it('draws one box per box of the shape, black only on the Impact Box', () => {
    const { boxes, rolls } = dpDrawing(dp([3, 1]), mechArea, measure);
    expect(boxes).toHaveLength(4);
    expect(boxes.filter((box) => box.impact)).toHaveLength(1);
    // The Impact Box is the center of the top row.
    expect(boxes[1]!.impact).toBe(true);
    expect(rolls).toBeUndefined();
  });

  it('leaves a gap of 20% of the box between boxes', () => {
    const { boxes } = dpDrawing(dp([3]), mechArea, measure);
    const [first, second] = boxes as [DpBox, DpBox];
    expect(second.x - (first.x + first.width)).toBeCloseTo(first.width * 0.2, 2);
  });

  it('keeps the box size fixed whatever the shape', () => {
    const light = dpDrawing(dp([1, 1, 1]), mechArea, measure).boxes[0]!;
    const heavy = dpDrawing(dp([5, 5, 5, 5, 5]), mechArea, measure).boxes[0]!;
    expect(light.width).toBe(heavy.width);
    // 5.8 less the gap that follows the box.
    expect(light.width).toBeCloseTo(4.83, 2);
  });

  it('centers the shape in the area', () => {
    const { boxes } = dpDrawing(dp([3, 1]), mechArea, measure);
    const { left, right, top, bottom } = bounds(boxes);
    expect(left - mechArea.x).toBeCloseTo(mechArea.x + mechArea.width - right, 1);
    expect(top - mechArea.y).toBeCloseTo(mechArea.y + mechArea.height - bottom, 1);
  });

  it('centers every row on the shape, so the shape stays symmetric', () => {
    const { boxes } = dpDrawing(dp([3, 1]), mechArea, measure);
    const top = bounds(boxes.slice(0, 3));
    const lower = bounds(boxes.slice(3));
    expect((lower.left + lower.right) / 2).toBeCloseTo((top.left + top.right) / 2, 2);
  });

  it('places the exact boxes of a two-row shape', () => {
    expect(dpDrawing(dp([3, 1]), mechArea, measure).boxes).toEqual([
      { x: 172.28, y: 449.18, width: 4.83, height: 4.83, impact: false },
      { x: 178.08, y: 449.18, width: 4.83, height: 4.83, impact: true },
      { x: 183.88, y: 449.18, width: 4.83, height: 4.83, impact: false },
      { x: 178.08, y: 454.98, width: 4.83, height: 4.83, impact: false },
    ]);
  });

  it('writes Rolls left of the shape, centered on it together', () => {
    const { boxes, rolls } = dpDrawing(dp([1, 1], 5), mechArea, measure);
    expect(rolls).toEqual({ text: '5×', x: 173.1, y: 457.65, fontSize: 9 });
    const { left, right, top, bottom } = bounds(boxes);
    // Text then gap then shape, with the two together centered in the area.
    expect(left - rolls!.x).toBeCloseTo(9.97, 2);
    expect(rolls!.x - mechArea.x).toBeCloseTo(mechArea.x + mechArea.width - right, 1);
    expect(rolls!.y).toBeGreaterThan(top);
    expect(rolls!.y).toBeLessThan(bottom);
  });

  it('shrinks a shape too heavy for the area rather than clipping it', () => {
    const { boxes } = dpDrawing(dp([1, 1, 1, 1, 1]), vehicleArea, measure);
    const { left, right, top, bottom } = bounds(boxes);
    expect(boxes[0]!.width).toBeLessThan(7.75 / 1.2);
    expect(top).toBeGreaterThanOrEqual(vehicleArea.y);
    expect(bottom).toBeLessThanOrEqual(vehicleArea.y + vehicleArea.height);
    expect(left).toBeGreaterThanOrEqual(vehicleArea.x);
    expect(right).toBeLessThanOrEqual(vehicleArea.x + vehicleArea.width);
  });

  it('keeps the largest shape a card holds inside its area', () => {
    for (const area of [mechArea, vehicleArea]) {
      const rows = area === mechArea ? [5, 5, 5, 5, 5] : [3, 3, 3, 3];
      const { boxes } = dpDrawing(dp(rows), area, measure);
      const { left, right, top, bottom } = bounds(boxes);
      expect(left).toBeGreaterThanOrEqual(area.x);
      expect(right).toBeLessThanOrEqual(area.x + area.width);
      expect(top).toBeGreaterThanOrEqual(area.y);
      expect(bottom).toBeLessThanOrEqual(area.y + area.height);
      // Unshrunk: the box is the cell less its gap.
      expect(boxes[0]!.width).toBeCloseTo(area.cellSize / 1.2, 2);
    }
  });
});
