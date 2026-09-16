/**
 * Reads the colour tokens out of `global.css` so a test can check a pair's contrast. Kept to plain
 * text parsing: the tokens are literal hex values by design (ADR 0004), so nothing here needs a
 * browser or a computed style.
 */

export type Palette = Record<string, string>;

/** The body of the `{ ... }` block that starts at or after `from`, with its braces balanced. */
function blockAt(css: string, from: number): string {
  const open = css.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('Unbalanced braces in the CSS');
}

function declarations(block: string): Palette {
  const tokens: Palette = {};
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens[name] = value.trim();
  }
  return tokens;
}

/**
 * The light palette, and the dark one it becomes under `prefers-color-scheme: dark` — the light
 * tokens with the dark block's overrides applied, which is what a browser resolves.
 */
export function palettes(css: string): { light: Palette; dark: Palette } {
  const light = declarations(blockAt(css, css.indexOf(':root')));
  const darkMedia = css.indexOf('prefers-color-scheme: dark');
  if (darkMedia === -1) throw new Error('No prefers-color-scheme: dark block in the CSS');
  const dark = declarations(blockAt(css, css.indexOf(':root', darkMedia)));
  return { light, dark: { ...light, ...dark } };
}

/** A token's value, or a failure naming the token rather than a later one about `undefined`. */
export function token(palette: Palette, name: string): string {
  const value = palette[name];
  if (value === undefined) throw new Error(`No ${name} in the palette`);
  return value;
}

function channels(colour: string): [number, number, number] {
  const hex = colour.trim().replace('#', '');
  const wide = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(wide)) throw new Error(`Not a hex colour: ${colour}`);
  return [0, 2, 4].map((at) => parseInt(wide.slice(at, at + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

/** WCAG relative luminance. */
function luminance(colour: string): number {
  const linear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const [r, g, b] = channels(colour);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The WCAG contrast ratio between two opaque colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [darker, lighter] = [luminance(a), luminance(b)].sort((x, y) => x - y) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}
