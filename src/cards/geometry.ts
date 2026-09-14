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
