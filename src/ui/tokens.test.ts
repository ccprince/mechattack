import { describe, expect, it } from 'vitest';
import css from './global.css?inline';
import { contrastRatio, palettes, token } from './testTokens';

const { light, dark } = palettes(css);

/** Every pair of tokens the UI puts on top of each other, and where it does it. */
const textPairs: [ink: string, on: string, where: string][] = [
  ['--ink', '--surface', 'body text on a panel'],
  ['--ink', '--surface-sunken', 'body text on the page'],
  ['--ink', '--warning-surface', 'the recovery banner'],
  ['--ink-muted', '--surface', 'a disabled button, a Bp total on the selected row'],
  ['--ink-muted', '--surface-sunken', 'the footer, the empty-editor note'],
  ['--accent', '--surface', 'a link in the app bar'],
  ['--accent', '--surface-sunken', 'a link in the footer'],
  ['--danger', '--surface', 'an over-limit Bp total in the app bar'],
  ['--danger', '--surface-sunken', 'an over-limit value in the editor'],
  ['--ink-inverse', '--danger', 'the Issues badge on a Unit Profile row'],
  ['--danger-ink', '--danger-surface', "the editor's Issues panel"],
  ['--warning-ink', '--warning-badge', 'the same-name badge on a Unit Profile row'],
  ['--warning-ink', '--surface', "the editor's name-clash hint"],
  ['--warning-ink', '--surface-sunken', 'a name-clash hint on the page'],
];

/** Borders and rules: they identify a control or a panel, so WCAG asks 3:1, not 4.5:1. */
const uiPairs: [mark: string, on: string, where: string][] = [
  ['--line', '--surface', 'a control border'],
  ['--line', '--surface-sunken', 'the app bar and footer rules'],
  ['--line-strong', '--surface', 'a hovered button, the selected row'],
  ['--line-strong', '--surface-sunken', 'a hovered button on the page'],
  ['--accent', '--surface', 'the focus ring on a control'],
  ['--accent', '--surface-sunken', 'the focus ring on the page'],
  ['--danger', '--danger-surface', "the Issues panel's rule"],
  ['--warning', '--warning-surface', "the recovery banner's border"],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('the %s palette', (_scheme, palette) => {
  it.each(textPairs)('reads %s on %s — %s', (ink, on) => {
    expect(contrastRatio(token(palette, ink), token(palette, on))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(uiPairs)('shows %s against %s — %s', (mark, on) => {
    expect(contrastRatio(token(palette, mark), token(palette, on))).toBeGreaterThanOrEqual(3);
  });

  it('keeps the card preview on white paper', () => {
    expect(contrastRatio(token(palette, '--paper'), '#000')).toBeCloseTo(21);
  });
});

/*
 * In light mode the paper is the same white as a panel and it's the drop shadow that lifts it off the
 * page. In dark mode the page falls away from it instead, so the card has to stand off that surround
 * on its own.
 */
it('stands the card preview off a dark page', () => {
  expect(contrastRatio(token(dark, '--paper'), token(dark, '--surface-sunken'))).toBeGreaterThan(3);
});
