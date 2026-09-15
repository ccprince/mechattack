export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const armorGrid = { x: 44, width: 206, top: 90, rowHeight: 20 };

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
