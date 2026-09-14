import alfaSlabOneUrl from '../assets/fonts/AlfaSlabOne-Regular.ttf?url';
import robotoSlabSemiBoldUrl from '../assets/fonts/RobotoSlab-SemiBold.ttf?url';
import type { Measure } from './fitText';

/**
 * The fonts the card templates name. The page, text measurement and the PDF all use these same
 * files, so text that fits in the preview fits in the PDF.
 */
export const cardFonts = [
  { family: 'Alfa Slab One', weight: '400', url: alfaSlabOneUrl, file: 'AlfaSlabOne-Regular.ttf' },
  {
    family: 'Roboto Slab',
    weight: '600',
    url: robotoSlabSemiBoldUrl,
    file: 'RobotoSlab-SemiBold.ttf',
  },
] as const;

let loaded: Promise<void> | undefined;

/** Adds the card fonts to the document and resolves once they're usable. Safe to call repeatedly. */
export function loadCardFonts(): Promise<void> {
  loaded ??= Promise.all(
    cardFonts.map(async ({ family, weight, url }) => {
      const face = new FontFace(family, `url(${url})`, { weight });
      document.fonts.add(await face.load());
    }),
  ).then(() => undefined);
  return loaded;
}

/** Measures in the value font (`.val`). Call after `loadCardFonts()` resolves. */
export function createValueMeasure(): Measure {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable, so card text cannot be measured.');
  return (text, fontSize) => {
    context.font = `600 ${fontSize}px "Roboto Slab"`;
    return context.measureText(text).width;
  };
}
