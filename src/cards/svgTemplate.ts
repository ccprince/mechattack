import type { DpDrawing } from './dpShape';
import { hatchLines, type Rect } from './geometry';

const svgNs = 'http://www.w3.org/2000/svg';

export interface ParsedTemplate {
  svg: SVGSVGElement;
  /** The emptied `#data` group, ready for this unit's values. */
  data: SVGGElement;
}

/**
 * Parses a card template, removes its Google Fonts `@import` (the app supplies the fonts) and
 * empties `#data`.
 */
export function parseTemplate(source: string): ParsedTemplate {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = doc.documentElement as unknown as SVGSVGElement;
  if (doc.querySelector('parsererror') || svg.namespaceURI !== svgNs) {
    throw new Error('Card template is not valid SVG.');
  }
  for (const style of svg.querySelectorAll('style')) {
    style.textContent = (style.textContent ?? '').replace(/@import[^;]*;/g, '');
  }
  // Adopt into the page's document so the card can be mounted in the preview.
  const adopted = document.importNode(svg, true);
  const data = adopted.querySelector<SVGGElement>('#data');
  if (!data) throw new Error('Card template has no #data group.');
  data.replaceChildren();
  return { svg: adopted, data };
}

/** Adds a single-line value. Sets `font-size` as a style, because the `.val` class rule beats an attribute. */
export function addValue(
  data: SVGGElement,
  field: string,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  anchor: 'start' | 'middle' = 'start',
): SVGTextElement {
  const el = createValueText(data, field, x, y, fontSize);
  if (anchor !== 'start') el.setAttribute('text-anchor', anchor);
  el.textContent = text;
  data.append(el);
  return el;
}

/** Adds a multi-line value, one `<tspan>` per line, `lineHeight` apart. */
export function addWrappedValue(
  data: SVGGElement,
  field: string,
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
): SVGTextElement {
  const el = createValueText(data, field, x, y, fontSize);
  lines.forEach((line, i) => {
    const tspan = data.ownerDocument.createElementNS(svgNs, 'tspan');
    tspan.setAttribute('x', String(x));
    if (i > 0) tspan.setAttribute('dy', String(lineHeight));
    tspan.textContent = line;
    el.append(tspan);
  });
  data.append(el);
  return el;
}

/** The Impact Box prints black; the rest of a Dp prints gray (docs/cards.md). */
const dpFill = { impact: '#000', rest: '#888' };

/**
 * Draws one Dp in its area: a rect per box, plus the `N×` Rolls text when the Weapon has Rolls.
 * `row` names the group as `data-dp`, like `la` or `mount1`.
 */
export function addDp(data: SVGGElement, row: string, { boxes, rolls }: DpDrawing): SVGGElement {
  const doc = data.ownerDocument;
  const group = doc.createElementNS(svgNs, 'g');
  group.setAttribute('data-dp', row);

  for (const { x, y, width, height, impact } of boxes) {
    const box = doc.createElementNS(svgNs, 'rect');
    box.setAttribute('x', String(x));
    box.setAttribute('y', String(y));
    box.setAttribute('width', String(width));
    box.setAttribute('height', String(height));
    box.setAttribute('fill', impact ? dpFill.impact : dpFill.rest);
    group.append(box);
  }
  if (rolls) {
    const text = createValueText(data, `${row}-rolls`, rolls.x, rolls.y, rolls.fontSize);
    text.textContent = rolls.text;
    group.append(text);
  }

  data.append(group);
  return group;
}

/**
 * Grays out `rect` and hatches it at 45°. The hatching, not the gray, is what marks the block as
 * unusable, so the card still reads in one ink or to a colour-blind player.
 */
export function addCrossOut(data: SVGGElement, rect: Rect): void {
  const doc = data.ownerDocument;
  const block = doc.createElementNS(svgNs, 'rect');
  block.setAttribute('class', 'crossed');
  block.setAttribute('x', String(rect.x));
  block.setAttribute('y', String(rect.y));
  block.setAttribute('width', String(rect.width));
  block.setAttribute('height', String(rect.height));
  const hatch = doc.createElementNS(svgNs, 'path');
  hatch.setAttribute(
    'd',
    hatchLines(rect)
      .map(({ x1, y1, x2, y2 }) => `M${x1} ${y1}L${x2} ${y2}`)
      .join(' '),
  );
  hatch.setAttribute('fill', 'none');
  hatch.setAttribute('stroke', '#333');
  hatch.setAttribute('stroke-width', '0.5');
  hatch.setAttribute('opacity', '0.6');
  data.append(block, hatch);
}

/**
 * Draws a warning triangle filling `rect`: a black path with a white `!` drawn as shapes, so it needs
 * no font. `mark` names it as `data-mark`.
 */
export function addWarningTriangle(data: SVGGElement, mark: string, rect: Rect): void {
  const { x, y, width, height } = rect;
  const doc = data.ownerDocument;
  const group = doc.createElementNS(svgNs, 'g');
  group.setAttribute('data-mark', mark);

  const triangle = doc.createElementNS(svgNs, 'path');
  triangle.setAttribute('d', `M${x + width / 2} ${y}L${x + width} ${y + height}H${x}Z`);
  triangle.setAttribute('fill', '#000');
  triangle.setAttribute('stroke', '#000');
  triangle.setAttribute('stroke-width', '0.8');
  triangle.setAttribute('stroke-linejoin', 'round');

  // The `!`: a bar from 35% to 70% of the height and a dot from 78%, both centered.
  const centerX = x + width / 2;
  const stroke = width * 0.14;
  const whiteRect = (top: number, rectHeight: number) => {
    const rect = doc.createElementNS(svgNs, 'rect');
    rect.setAttribute('x', String(centerX - stroke / 2));
    rect.setAttribute('y', String(top));
    rect.setAttribute('width', String(stroke));
    rect.setAttribute('height', String(rectHeight));
    rect.setAttribute('fill', '#fff');
    return rect;
  };

  group.append(
    triangle,
    whiteRect(y + height * 0.35, height * 0.35),
    whiteRect(y + height * 0.78, stroke),
  );
  data.append(group);
}

function createValueText(
  data: SVGGElement,
  field: string,
  x: number,
  y: number,
  fontSize: number,
): SVGTextElement {
  const el = data.ownerDocument.createElementNS(svgNs, 'text');
  el.setAttribute('class', 'val');
  el.setAttribute('data-field', field);
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  el.setAttribute('style', `font-size:${fontSize}px`);
  return el;
}
