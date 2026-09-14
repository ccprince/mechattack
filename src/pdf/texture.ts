const dpi = 200;
const cache = new Map<string, Promise<string>>();

/**
 * Renders a card's `#texture` group (the filter-based stone texture) to a JPEG data URL, because
 * svg2pdf ignores `<filter>`. Cached per `key` (the card kind), since every card of a kind shares it.
 */
export function rasterizeTexture(key: string, card: SVGSVGElement): Promise<string> {
  let image = cache.get(key);
  if (!image) {
    image = render(card);
    cache.set(key, image);
  }
  return image;
}

async function render(card: SVGSVGElement): Promise<string> {
  const [, , width, height] = (card.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  if (!width || !height) throw new Error('Card template has no viewBox.');

  // Texture-only SVG: <defs> plus #texture, no text, so no web fonts are needed inside <img>.
  const textureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  textureSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  textureSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const pxWidth = Math.round((width / 100) * dpi);
  const pxHeight = Math.round((height / 100) * dpi);
  textureSvg.setAttribute('width', String(pxWidth));
  textureSvg.setAttribute('height', String(pxHeight));
  for (const selector of ['defs', '#texture']) {
    const part = card.querySelector(selector);
    if (part) textureSvg.append(part.cloneNode(true));
  }

  const blob = new Blob([new XMLSerializer().serializeToString(textureSvg)], {
    type: 'image/svg+xml',
  });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = pxWidth;
    canvas.height = pxHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable.');
    // JPEG has no alpha: paint white under the rounded corners the texture's clip leaves empty.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, pxWidth, pxHeight);
    context.drawImage(img, 0, 0, pxWidth, pxHeight);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
