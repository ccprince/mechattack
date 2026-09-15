import type { Rect } from './geometry';

export const printSizes = ['large', 'sleeve'] as const;
export type PrintSize = (typeof printSizes)[number];

export const printSizeLabels: Record<PrintSize, string> = { large: 'Large', sleeve: 'Sleeve' };

/** US Letter, portrait, in inches. */
export const page = { width: 8.5, height: 11 };

const nativeSlot = { width: 3.9, height: 5.1 };

const grids = {
  large: { scale: 1, columns: 2, rows: 2, gutter: 0.2 },
  sleeve: { scale: 2.5 / 3.9, columns: 3, rows: 3, gutter: 0.15 },
} as const;

export function slotsPerPage(size: PrintSize): number {
  return grids[size].columns * grids[size].rows;
}

/**
 * The slot (in inches from the page's top-left) that a Mech or Vehicle card fills at `index` on its
 * page. The grid is centered on the page. See docs/cards.md, "Page layout".
 */
export function slotRect(size: PrintSize, index: number): Rect {
  const { scale, columns, rows, gutter } = grids[size];
  const width = nativeSlot.width * scale;
  const height = nativeSlot.height * scale;
  const marginX = (page.width - columns * width - (columns - 1) * gutter) / 2;
  const marginY = (page.height - rows * height - (rows - 1) * gutter) / 2;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: marginX + column * (width + gutter),
    y: marginY + row * (height + gutter),
    width,
    height,
  };
}
