import type { Dp } from '../domain/catalog';
import type { Measure } from './fitText';
import type { Rect } from './geometry';

/** A Dp area of a card: where the shape goes and how big its boxes are (docs/cards.md). */
export interface DpArea extends Rect {
  /**
   * One cell of the shape, the same on every row of a card: a box plus the gap after it, sized so the
   * largest shape the card's grid holds fills the area's smaller side.
   */
  cellSize: number;
  /** Font size of the `N×` Rolls text, matching the card's weapon name. */
  rollsFontSize: number;
}

/** One box of a drawn Dp. The Impact Box prints black, the rest `#888`. */
export interface DpBox extends Rect {
  impact: boolean;
}

/** The `N×` Rolls text, placed left of the shape and vertically centered on it. */
export interface DpRolls {
  text: string;
  /** Start of the text, on its baseline. */
  x: number;
  y: number;
  fontSize: number;
}

export interface DpDrawing {
  boxes: DpBox[];
  /** Absent when the Weapon rolls one Hit Location. */
  rolls?: DpRolls;
}

/** The gap between boxes, as a share of a cell: 20% of the box itself (docs/cards.md). */
const gapOfCell = 0.2 / 1.2;
/** Baseline offset that centers a line of text on a point, as a share of the font size. */
const baselineFromCenter = 0.35;

/**
 * Lays out a Weapon's Dp in a card's Dp area: one box per box of the shape, plus the `N×` text when
 * the Weapon has Rolls, with shape and text centered together. A shape too large for the area (only
 * possible on an illegal Unit Profile) shrinks to fit rather than clipping.
 */
export function dpDrawing(dp: Dp, area: DpArea, measure: Measure): DpDrawing {
  const { rows, rolls } = dp;
  const rollsText = rolls > 1 ? `${rolls}×` : undefined;
  // The text is followed by the same gap that separates two boxes. It keeps the card's font size
  // even when the boxes shrink, so it stays legible; the layout below centers on this width either way.
  const textWidth =
    rollsText === undefined
      ? 0
      : measure(rollsText, area.rollsFontSize) + area.cellSize * gapOfCell;

  // A cell's gap falls after its box, so a run of n cells spans n cells less that trailing gap.
  const extent = (cells: number, cellSize: number) => (cells - gapOfCell) * cellSize;
  const widest = Math.max(...rows);
  const scale = Math.max(
    0,
    Math.min(
      1,
      (area.width - textWidth) / extent(widest, area.cellSize),
      area.height / extent(rows.length, area.cellSize),
    ),
  );
  const cellSize = area.cellSize * scale;
  const boxSize = cellSize * (1 - gapOfCell);
  const shape = { width: extent(widest, cellSize), height: extent(rows.length, cellSize) };

  const left = area.x + (area.width - textWidth - shape.width) / 2;
  const top = area.y + (area.height - shape.height) / 2;
  const centerX = left + textWidth + shape.width / 2;

  const boxes = rows.flatMap((count, row) => {
    // Every row is centered on the shape's center column, so the shape stays symmetric.
    const rowLeft = centerX - extent(count, cellSize) / 2;
    return Array.from({ length: count }, (_, column): DpBox => ({
      x: round(rowLeft + column * cellSize),
      y: round(top + row * cellSize),
      width: round(boxSize),
      height: round(boxSize),
      // The Impact Box is the center of the top row.
      impact: row === 0 && column === (count - 1) / 2,
    }));
  });

  if (rollsText === undefined) return { boxes };
  return {
    boxes,
    rolls: {
      text: rollsText,
      x: round(left),
      y: round(top + shape.height / 2 + area.rollsFontSize * baselineFromCenter),
      fontSize: area.rollsFontSize,
    },
  };
}

/** Rounded to 0.01 of a viewBox unit, finer than any printer resolves. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
