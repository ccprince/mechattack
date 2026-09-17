import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeStore } from '../domain/testStores';
import { confirmation, profileRow, setUpApp } from './testApp';
// The dialog's size and colours come from the tokens, which come with the entry point, not the app.
import './global.css';

const load = setUpApp();

/** Starts the app with one new Mech, and asks to delete it. */
async function askToDeleteMech() {
  load(fakeStore());
  await page.getByRole('button', { name: 'Add Mech' }).click();
  const bin = profileRow('New Mech').getByRole('button', { name: 'Delete New Mech' });
  await bin.click();
  await expect.element(confirmation('Delete New Mech?')).toBeVisible();
  return bin;
}

describe('the confirmation dialog', () => {
  it('opens on Cancel, so Enter never destroys anything', async () => {
    await askToDeleteMech();
    const cancel = confirmation().getByRole('button', { name: 'Cancel' });
    await expect.element(cancel).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await expect.element(confirmation()).not.toBeInTheDocument();
    await expect.element(profileRow('New Mech')).toBeInTheDocument();
  });

  it('cancels on Escape, handing focus back to what asked', async () => {
    const bin = await askToDeleteMech();

    await userEvent.keyboard('{Escape}');
    await expect.element(confirmation()).not.toBeInTheDocument();
    await expect.element(profileRow('New Mech')).toBeInTheDocument();
    await expect.element(bin).toHaveFocus();
  });

  it('asks again after an Escape, and acts on the second answer', async () => {
    const bin = await askToDeleteMech();
    await userEvent.keyboard('{Escape}');
    await expect.element(confirmation()).not.toBeInTheDocument();

    await bin.click();
    await confirmation().getByRole('button', { name: 'Delete' }).click();
    await expect.element(profileRow('New Mech')).not.toBeInTheDocument();
  });

  it('fills a destructive answer with the danger colour, and only that one', async () => {
    await askToDeleteMech();
    const fill = (name: string) =>
      getComputedStyle(confirmation().getByRole('button', { name }).element()).backgroundColor;
    // The token resolved to a colour the way a background resolves it, so the two compare equal.
    const probe = document.createElement('div');
    probe.style.background = 'var(--danger)';
    document.body.append(probe);
    const danger = getComputedStyle(probe).backgroundColor;
    probe.remove();

    expect(fill('Delete')).toBe(danger);
    expect(fill('Cancel')).not.toBe(danger);
  });
});
