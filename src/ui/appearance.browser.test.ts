import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
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

/** Gives back the viewport after each test in the block, for a test that narrows it to a phone. */
function keepViewport() {
  const size = { width: window.innerWidth, height: window.innerHeight };
  afterEach(() => page.viewport(size.width, size.height));
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
  keepViewport();

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

/*
 * A finger needs a bigger target than a pointer does, so an icon button — the steppers, Duplicate,
 * Delete and the three Adds, the controls a player touches most — grows on a touch device (#97). The
 * gate is the input device rather than the viewport: a narrow desktop window doesn't need the room,
 * and a tablet does.
 */
describe('an icon button', () => {
  /*
   * Every button in the app holding an icon and nothing else, with two Mechs in the list and the
   * second one selected. Named rather than found by markup shape, so the elements stay free to change
   * underneath (ADR 0004), and so a button going missing fails instead of shrinking the set.
   */
  const names = [
    'Army Lists',
    'Add Mech',
    'Add Vehicle',
    'Add Troop',
    'Decrease Bp Limit',
    'Increase Bp Limit',
    'One more New Mech 2',
    'One fewer New Mech 2',
    'Duplicate New Mech 2',
    'Delete New Mech 2',
    'Decrease Armor',
    'Increase Armor',
    'Decrease Heat Sinks',
    'Increase Heat Sinks',
    'Decrease Engine Upgrades',
    'Increase Engine Upgrades',
  ];

  const boxes = () =>
    names.map((name) => ({
      name,
      box: page.getByRole('button', { name, exact: true }).element().getBoundingClientRect(),
    }));

  /** Every pair of buttons on the page drawn on top of each other, named for the failure message. */
  function overlappingButtons(): string[] {
    const drawn = page
      .getByRole('button')
      .elements()
      .map((button) => ({
        name: button.ariaLabel ?? button.textContent,
        box: button.getBoundingClientRect(),
      }))
      .filter(({ box }) => box.width > 0);

    // A shared edge isn't an overlap, and neither is the sub-pixel a fractional grid track leaves.
    const over = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;

    return drawn.flatMap(({ name, box }, index) =>
      drawn
        .slice(index + 1)
        .filter((other) => over(box, other.box))
        .map((other) => `${name} / ${other.name}`),
    );
  }

  /** Names the ones an expectation rejects, at the size they came out, for the failure message. */
  const listing = (wrong: ReturnType<typeof boxes>) =>
    wrong.map(({ name, box }) => `${name}: ${Math.round(box.width)}×${Math.round(box.height)}`);

  /*
   * Chromium decides `pointer: coarse` from touch support, which only the browser can turn on, so
   * these drive it over CDP rather than from the page.
   */
  describe('on a touch device', () => {
    const session = cdp();
    const touch = (enabled: boolean) =>
      session.send('Emulation.setTouchEmulationEnabled', { enabled, maxTouchPoints: 1 });

    beforeEach(() => touch(true));
    afterEach(() => touch(false));
    keepViewport();

    it('is a 44px square to hit', async () => {
      await loadWithTwoMechs();

      expect(listing(boxes().filter(({ box }) => box.width < 44 || box.height < 44))).toEqual([]);
    });

    /*
     * A 44px stepper needs room a 26px one didn't, and a control that won't narrow doesn't overflow
     * quietly — it paints over the field beside it. So this walks every width a phone, tablet or
     * split window might be, a pixel at a time, with each kind of Unit Profile in the editor.
     */
    it.each(['Mech', 'Vehicle', 'Troop'])(
      'leaves room for the rest of the page (%s)',
      async (kind) => {
        load(fakeStore());
        await page.getByRole('button', { name: `Add ${kind}` }).click();

        const wrong = new Set<string>();
        for (let width = 320; width <= 1400; width++) {
          await page.viewport(width, 900);
          for (const pair of overlappingButtons()) wrong.add(`${width}px: ${pair} overlap`);
          if (document.documentElement.scrollWidth > width)
            wrong.add(`${width}px: scrolls sideways`);
        }
        expect([...wrong]).toEqual([]);
      },
      60000,
    );
  });

  it('stays at the pointer size when the pointer is fine', async () => {
    await loadWithTwoMechs();

    // Drawn, and no larger than a pointer asks for: the rule is gated on the input device.
    const wrong = boxes().filter(
      ({ box }) => box.width < 24 || box.height < 24 || box.width >= 44 || box.height >= 44,
    );
    expect(listing(wrong)).toEqual([]);
  });
});

/*
 * A Hull Option is ticked by a checkbox the browser draws 13px square, so the target a player hits is
 * the `<label>` wrapped round it. That label is a full-width row but only as tall as its text, which
 * left it under the 24px WCAG 2.5.8 Target Size (Minimum, AA) asks for — the one place in the app that
 * missed the minimum rather than merely the comfortable 44 (#97).
 */
describe('a Hull Option', () => {
  /*
   * The label is the target: a checkbox is too small to hit, and wrapping it in a label is what makes
   * the row clickable. Reached from the checkbox's accessible name so the test doesn't name a class.
   */
  const targets = () =>
    ['Turret', 'Static Mount'].map((name) => {
      const check = page.getByRole('checkbox', { name, exact: true }).element();
      return { name, box: check.closest('label')!.getBoundingClientRect() };
    });

  const listing = (wrong: ReturnType<typeof targets>) =>
    wrong.map(({ name, box }) => `${name}: ${Math.round(box.width)}×${Math.round(box.height)}`);

  /** Starts the app with a Vehicle, the only kind of Unit Profile that has Hull Options. */
  async function loadWithAVehicle() {
    load(fakeStore());
    await page.getByRole('button', { name: 'Add Vehicle' }).click();
  }

  it('is tall enough to hit with a pointer', async () => {
    await loadWithAVehicle();

    expect(listing(targets().filter(({ box }) => box.height < 24))).toEqual([]);
  });

  describe('on a touch device', () => {
    const session = cdp();
    const touch = (enabled: boolean) =>
      session.send('Emulation.setTouchEmulationEnabled', { enabled, maxTouchPoints: 1 });

    beforeEach(() => touch(true));
    afterEach(() => touch(false));

    it('is as tall as a finger needs, like the icon buttons beside it', async () => {
      await loadWithAVehicle();

      expect(listing(targets().filter(({ box }) => box.height < 44))).toEqual([]);
    });
  });
});
