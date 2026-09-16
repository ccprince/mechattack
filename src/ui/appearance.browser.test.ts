import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeStore } from '../domain/testStores';
import { openButton, profileRow, setUpApp } from './testApp';
// The tokens and base styles come with the entry point, not with the app: this file is about them.
import './global.css';

const load = setUpApp();

const styleOf = (element: Element) => window.getComputedStyle(element);

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
