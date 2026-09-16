import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeStore } from '../domain/testStores';
import { setUpApp, unitProfiles } from './testApp';
// The tokens and base styles come with the entry point, not with the app: this file is about them.
import './global.css';

const load = setUpApp();

const styleOf = (element: Element) => window.getComputedStyle(element);
const openButton = (name: string) =>
  unitProfiles()
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) })
    .getByRole('button')
    .first();

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
    const name = (row: Element) => styleOf(row.querySelector('span')!).fontWeight;
    expect(Number(name(selected))).toBeGreaterThan(Number(name(other)));
    expect(styleOf(selected).borderInlineStartWidth).not.toBe(
      styleOf(other).borderInlineStartWidth,
    );

    // The ring belongs to focus alone: an unfocused selected row doesn't wear one.
    expect(styleOf(selected).outlineStyle).toBe('none');
  });
});
