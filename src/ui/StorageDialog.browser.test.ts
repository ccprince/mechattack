import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeStore } from '../domain/testStores';
import { armyListsButton, chooseFromMenu, setUpApp } from './testApp';

const load = setUpApp();

const dialog = () => page.getByRole('dialog', { name: 'Where your Army Lists are kept' });
const footerButton = () =>
  page.getByRole('button', { name: 'Army Lists are saved in this browser only.' });

describe('where Army Lists are kept', () => {
  it('opens from the footer and closes on Escape, handing focus back', async () => {
    load(fakeStore());
    await expect.element(dialog()).not.toBeInTheDocument();

    await footerButton().click();
    await expect.element(dialog()).toBeVisible();
    await expect.element(dialog().getByText('Nothing is uploaded', { exact: false })).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(footerButton()).toHaveFocus();
  });

  it('opens from the Army Lists menu and closes on Close, handing focus to the menu button', async () => {
    load(fakeStore());

    await chooseFromMenu('Where are Army Lists kept?');
    await expect.element(dialog()).toBeVisible();

    await dialog().getByRole('button', { name: 'Close' }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(armyListsButton()).toHaveFocus();
  });
});
