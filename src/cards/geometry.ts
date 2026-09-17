export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The armor grid's box, not just its cells: the block spans the full width, so an unusable row is
 * marked across the armor value that names it as well as across its ten cells (docs/cards.md).
 */
const armorGrid = { x: 12, width: 238, top: 90, rowHeight: 20 };

/**
 * The block of armor rows to cross out on a Mech or Vehicle card: every row above `armor`, from the
 * top row down. `topRowArmor` is the value printed on the top row (150 Mech, 60 Vehicle).
 */
export function armorCrossOut(armor: number, topRowArmor: number): Rect | null {
  const rows = Math.max(0, Math.floor((topRowArmor - armor) / 10));
  if (rows === 0) return null;
  const allRows = topRowArmor / 10;
  return {
    x: armorGrid.x,
    y: armorGrid.top,
    width: armorGrid.width,
    height: Math.min(rows, allRows) * armorGrid.rowHeight,
  };
}

const strengthTracker = { x: 12, boxWidth: 23.8, columns: 10, rows: 2, top: 68, rowHeight: 20.5 };

/**
 * The blocks of strength boxes to cross out on a Troop card: every box above `sv`, one block per row
 * of the tracker.
 */
export function strengthCrossOut(sv: number): Rect[] {
  const { x, boxWidth, columns, rows, top, rowHeight } = strengthTracker;
  const blocks: Rect[] = [];
  for (let row = 0; row < rows; row++) {
    const kept = Math.min(columns, Math.max(0, sv - row * columns));
    if (kept === columns) continue;
    // Rounded to 0.1 so the edges match the tracker's grid lines exactly.
    const left = Math.round((x + kept * boxWidth) * 10) / 10;
    blocks.push({
      x: left,
      y: top + row * rowHeight,
      width: Math.round((x + columns * boxWidth - left) * 10) / 10,
      height: rowHeight,
    });
  }
  return blocks;
}

/** A straight line between two points, in viewBox units. */
export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * How far apart the hatch lines run. Wide enough that the lines stay separate at Sleeve size, where
 * they carry a stroke thick enough to print; closer spacing at that weight fills in to a gray wash.
 */
const hatchSpacing = 9;

/**
 * The 45° lines that hatch a crossed-out block, top-left to bottom-right. Clipped to the block by
 * arithmetic rather than a `clipPath`, which svg2pdf ignores (docs/cards.md).
 */
export function hatchLines(block: Rect, spacing = hatchSpacing): Line[] {
  const lines: Line[] = [];
  const endX = block.x + block.width;
  const endY = block.y + block.height;
  // Offsets step in `spacing` from the block's top-left corner, so offset 0 is always the corner
  // diagonal and even a block smaller than the spacing is hatched. A line enters the block on its
  // top edge, or on the left edge once the offset has run past the corner.
  const first = -Math.ceil(block.height / spacing) * spacing;
  for (let offset = first; offset < block.width; offset += spacing) {
    const x1 = offset >= 0 ? block.x + offset : block.x;
    const y1 = offset >= 0 ? block.y : block.y - offset;
    const run = Math.min(endX - x1, endY - y1);
    // Rounded to 0.01 of a unit, a ten-thousandth of an inch: the tracker's box width is a
    // repeating decimal, which would otherwise print 17 digits of float noise into the path.
    if (run > 0) lines.push({ x1, y1, x2: round(x1 + run), y2: round(y1 + run) });
  }
  return lines;
}

const round = (value: number) => Math.round(value * 100) / 100;
