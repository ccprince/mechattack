import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeStore } from '../domain/testStores';
import { openButton, profileRow, setUpApp } from './testApp';
// The tokens and base styles come with the entry point, not with the app: this file is about them.
import './global.css';

const load = setUpApp();

const styleOf = (element: Element) => window.getComputedStyle(element);

/*
 * How many line boxes the element's text takes. Counts distinct rect tops rather than rects: a line
 * made of several text nodes, as `{value} Bp` is, gives one rect each and would otherwise read as
 * several lines.
 */
function lineCount(element: Element): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  const tops = Array.from(range.getClientRects(), (rect) => Math.round(rect.top));
  return new Set(tops).size;
}

/** Starts the app with two Mechs, the second one selected. */
async function loadWithTwoMechs() {
  load(fakeStore());
  await page.getByRole('button', { name: 'Add Mech' }).click();
  await page.getByRole('button', { name: 'Add Mech' }).click();
}

describe('focus', () => {
  it('rings whatever the keyboard lands on', async () => {
    await loadWithTwoMechs();
    page.getByLabelText('Army List name').element().focus();

    // Far enough to pass a button, a text input and a number input.
    for (let step = 0; step < 12; step++) {
      await userEvent.tab();
      const focused = document.activeElement;
      expect(focused).not.toBe(document.body);
      const { outlineStyle, outlineWidth } = styleOf(focused!);
      expect(`${focused!.tagName} ${outlineStyle} ${outlineWidth}`).toBe(
        `${focused!.tagName} solid 2px`,
      );
    }
  });
});

describe('the selected Unit Profile', () => {
  it('is marked by more than a colour, and apart from the focus ring', async () => {
    await loadWithTwoMechs();
    const selected = openButton('New Mech 2').element();
    const other = openButton('New Mech').element();

    // Weight and a leading rule, not colour alone.
    const weightOf = (name: string) =>
      Number(styleOf(profileRow(name).getByText(name, { exact: true }).element()).fontWeight);
    expect(weightOf('New Mech 2')).toBeGreaterThan(weightOf('New Mech'));
    expect(styleOf(selected).borderInlineStartWidth).not.toBe(
      styleOf(other).borderInlineStartWidth,
    );

    // The ring belongs to focus alone: an unfocused selected row doesn't wear one.
    expect(styleOf(selected).outlineStyle).toBe('none');
  });
});

/*
 * The title is the one fixed string in the UI set in Alfa Slab One, wide enough that it outgrows a
 * phone's width at its full size (#95). These are the narrow ends of the two steps that keep it on
 * one line, in CSS pixels; at the browser's default text size the widest phone that needs each is
 * comfortably inside them.
 */
describe('the app title', () => {
  const size = { width: window.innerWidth, height: window.innerHeight };
  afterEach(() => page.viewport(size.width, size.height));

  it.each([
    ['a 412px phone, at full size', 412],
    ['a 360px phone, a step down', 360],
    ['a 320px phone, two steps down', 320],
  ])('stays on one line on %s', async (_where, width) => {
    await page.viewport(width, 780);
    load(fakeStore());
    const title = await vi.waitFor(() => {
      const heading = document.querySelector('h1');
      if (!heading) throw new Error('The app has not rendered yet.');
      return heading;
    });

    // Alfa Slab One arrives after the first paint, and it's wider than the fallback it replaces.
    await vi.waitFor(() => {
      const { fontSize } = styleOf(title);
      expect(document.fonts.check(`400 ${fontSize} "Alfa Slab One"`)).toBe(true);
    });

    expect(lineCount(title)).toBe(1);
  });
});
