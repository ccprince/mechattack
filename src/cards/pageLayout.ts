import { armyListSlug } from '../domain/armyListDocument';
import type { UnitProfile } from '../domain/unitProfile';
import type { Rect } from './geometry';

export const printSizes = ['large', 'sleeve'] as const;
export type PrintSize = (typeof printSizes)[number];

export const printSizeLabels: Record<PrintSize, string> = { large: 'Large', sleeve: 'Sleeve' };

/**
 * The filename for an Army List's printed cards: the list's name, then what the file holds, and the
 * print size when it's the large one, so both sizes of a list can sit in one folder.
 */
export function cardsPdfFilename(listName: string, size: PrintSize): string {
  return `${armyListSlug(listName)}-cards${size === 'large' ? '-large' : ''}.pdf`;
}

/** US Letter, portrait, in inches. */
export const page = { width: 8.5, height: 11 };

/** The page edge most home printers can't print. */
const printableMargin = 0.25;

/**
 * Each kind's template size, in inches at scale 1. A Mech or Vehicle fills a slot, at a sleeve's 5:7
 * ratio (ADR 0009). Two Troops share a slot, with the rest of its height between them.
 */
const templateSizes: Record<UnitProfile['kind'], { width: number; height: number }> = {
  Mech: { width: 3.9, height: 5.46 },
  Vehicle: { width: 3.9, height: 5.46 },
  Troop: { width: 3.9, height: 2.59 },
};

const largeGutter = 0.2;

const grids = {
  // As big as fits two rows inside the printable margins.
  large: {
    scale: (page.height - 2 * printableMargin - largeGutter) / 2 / templateSizes.Mech.height,
    columns: 2,
    rows: 2,
    gutter: largeGutter,
  },
  // A standard 2.5" × 3.5" card sleeve.
  sleeve: { scale: 2.5 / templateSizes.Mech.width, columns: 3, rows: 2, gutter: 0.25 },
} as const;

function slotsPerPage(size: PrintSize): number {
  return grids[size].columns * grids[size].rows;
}

/** How big a card of this kind prints at this Print Size, in inches. */
export function printedCardSize(
  kind: UnitProfile['kind'],
  size: PrintSize,
): { width: number; height: number } {
  const { width, height } = templateSizes[kind];
  const { scale } = grids[size];
  return { width: width * scale, height: height * scale };
}

/**
 * The slot (in inches from the page's top-left) that a Mech or Vehicle card fills at `index` on its
 * page. The grid is centered on the page. See docs/cards.md, "Page layout".
 */
export function slotRect(size: PrintSize, index: number): Rect {
  const { columns, rows, gutter } = grids[size];
  const { width, height } = printedCardSize('Mech', size);
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

/** Where one card prints: its page (0-based) and its rect on that page, in inches. */
export interface CardPlacement {
  page: number;
  rect: Rect;
}

/**
 * Places cards of these kinds in order. A Mech or Vehicle fills a slot. A Troop fills the top half of
 * the next slot, and a Troop right after it the bottom half, so an odd Troop leaves its other half
 * empty. A page holds `slotsPerPage` slots. See docs/cards.md, "Page layout".
 */
export function placeCards(
  kinds: readonly UnitProfile['kind'][],
  size: PrintSize,
): CardPlacement[] {
  const perPage = slotsPerPage(size);
  let slot = -1;
  let bottomHalfFree = false;
  return kinds.map((kind) => {
    const half = kind === 'Troop';
    const bottom = half && bottomHalfFree;
    if (!bottom) slot++;
    bottomHalfFree = half && !bottom;

    const page = Math.floor(slot / perPage);
    const rect = slotRect(size, slot % perPage);
    if (!half) return { page, rect };
    const { height } = printedCardSize('Troop', size);
    return {
      page,
      rect: { ...rect, y: bottom ? rect.y + rect.height - height : rect.y, height },
    };
  });
}
