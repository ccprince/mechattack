import type { Rect } from './geometry';

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

/** Grays out `rect` and draws an X corner to corner across it. */
export function addCrossOut(data: SVGGElement, { x, y, width, height }: Rect): void {
  const doc = data.ownerDocument;
  const block = doc.createElementNS(svgNs, 'rect');
  block.setAttribute('class', 'crossed');
  block.setAttribute('x', String(x));
  block.setAttribute('y', String(y));
  block.setAttribute('width', String(width));
  block.setAttribute('height', String(height));
  const cross = doc.createElementNS(svgNs, 'path');
  const right = x + width;
  const bottom = y + height;
  cross.setAttribute('d', `M${x} ${y}L${right} ${bottom} M${x} ${bottom}L${right} ${y}`);
  cross.setAttribute('stroke', '#333');
  cross.setAttribute('stroke-width', '0.8');
  cross.setAttribute('opacity', '0.6');
  data.append(block, cross);
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
