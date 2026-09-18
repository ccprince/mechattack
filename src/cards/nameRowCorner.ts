import { addValue, addWarningTriangle } from './svgTemplate';

/**
 * Two things may print in the empty end of every card's NAME label row: the Copy Number and the
 * illegal warning triangle. They sit there as one right-justified group, identically on all three
 * cards (docs/cards.md).
 */

/** The illegal warning triangle: the group's rightmost element, so it never moves. */
export const nameMark = { x: 364, y: 15, width: 12, height: 11 };

/**
 * The Copy Number's right edge: the corner when it prints alone, shifted left of the triangle when
 * the card is marked illegal.
 */
const copyRight = { alone: 376, besideMark: 360 };
/**
 * Smaller than the name it belongs to, and set in the value font rather than the label's face: it's
 * this card's data, not the template's furniture.
 */
const copyNumberFontSize = 10;
/** The NAME label's own baseline, so the pair line up. */
const copyNumberBaseline = 25;

/**
 * Adds `(N)` to the name row's corner. Needs no fitting: the widest a Copy Number gets is `(100)`,
 * which still clears the NAME label (docs/cards.md).
 */
export function addCopyNumber(data: SVGGElement, copyNumber: number, illegal: boolean): void {
  const x = illegal ? copyRight.besideMark : copyRight.alone;
  addValue(data, 'copy', `(${copyNumber})`, x, copyNumberBaseline, copyNumberFontSize, 'end');
}

/** Adds the name row's corner: the warning triangle on an illegal card, and any Copy Number. */
export function addNameRowCorner(
  data: SVGGElement,
  copyNumber: number | undefined,
  illegal: boolean,
): void {
  if (illegal) addWarningTriangle(data, 'illegal', nameMark);
  if (copyNumber !== undefined) addCopyNumber(data, copyNumber, illegal);
}
