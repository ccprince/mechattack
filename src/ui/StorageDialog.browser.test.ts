import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeStore } from '../domain/testStores';
import { armyListsButton, chooseFromMenu, setUpApp } from './testApp';
// The dialog's size comes from the tokens, which come with the entry point, not with the app.
import './global.css';

const load = setUpApp();

const dialog = () => page.getByRole('dialog', { name: 'Where your Army Lists are kept' });
const footerButton = () =>
  page.getByRole('button', { name: 'Army Lists are saved in this browser only.' });

const opens = {
  'the footer': () => footerButton().click(),
  'the Army Lists menu': () => chooseFromMenu('Where are Army Lists kept?'),
};
// Opening from the menu closes it first, so focus returns to its button: the item is hidden by then.
const opener = {
  'the footer': footerButton,
  'the Army Lists menu': armyListsButton,
};
const closes = {
  Escape: () => userEvent.keyboard('{Escape}'),
  Close: () => dialog().getByRole('button', { name: 'Close' }).click(),
};

describe('where Army Lists are kept', () => {
  describe.each(Object.keys(opens) as (keyof typeof opens)[])('opened from %s', (from) => {
    it.each(Object.keys(closes) as (keyof typeof closes)[])(
      'closes on %s, handing focus back to what opened it',
      async (how) => {
        load(fakeStore());
        await expect.element(dialog()).not.toBeInTheDocument();

        await opens[from]();
        await expect.element(dialog()).toBeVisible();
        await expect
          .element(dialog().getByText('Nothing is uploaded', { exact: false }))
          .toBeVisible();

        await closes[how]();
        await expect.element(dialog()).not.toBeInTheDocument();
        await expect.element(opener[from]()).toHaveFocus();
      },
    );
  });

  it('opens at the top on a short phone screen, not scrolled down to Close', async () => {
    await page.viewport(390, 420);
    load(fakeStore());

    await footerButton().click();
    await expect.element(dialog()).toBeVisible();
    const element = dialog().element();
    expect(element.scrollHeight).toBeGreaterThan(element.clientHeight);
    expect(element.scrollTop).toBe(0);
  });
});

describe('whether this browser has agreed to keep them', () => {
  const agreed = () => dialog().getByText('This browser has agreed', { exact: false });
  const mayClear = () =>
    dialog().getByText('Some browsers clear saved data on their own', { exact: false });

  /** Stands in for `navigator.storage`; restored after each test with every other mock. */
  function stubStorage(storage: Partial<StorageManager> | undefined) {
    vi.spyOn(navigator, 'storage', 'get').mockReturnValue(storage as StorageManager);
  }

  it('checks each time the dialog opens', async () => {
    const persisted = vi.fn(async () => false);
    stubStorage({ persisted });
    load(fakeStore());

    await footerButton().click();
    await expect.element(mayClear()).toBeVisible();
    await expect.element(agreed()).not.toBeInTheDocument();
    await closes.Escape();

    persisted.mockResolvedValue(true);
    await footerButton().click();
    await expect.element(agreed()).toBeVisible();
    await expect
      .element(dialog().getByText("though they're still lost in the cases above", { exact: false }))
      .toBeVisible();
    await expect.element(mayClear()).not.toBeInTheDocument();
    await closes.Escape();

    persisted.mockResolvedValue(false);
    await footerButton().click();
    await expect.element(mayClear()).toBeVisible();
    await expect.element(agreed()).not.toBeInTheDocument();
  });

  it('keeps the usual wording when the browser can’t say', async () => {
    stubStorage(undefined);
    load(fakeStore());

    await footerButton().click();
    await expect.element(mayClear()).toBeVisible();
    await expect.element(agreed()).not.toBeInTheDocument();
  });
});
