import { expect, test } from '@playwright/test';

test('moves a lead to the next stage with the keyboard and announces it', async ({ page }) => {
  await page.goto('/iframe.html?id=patterns--board&viewMode=story');
  const contacted = page.getByRole('region', { name: /Contacted/ });
  await expect(contacted.getByText('Kite & Co')).toHaveCount(0);

  const live = page.locator('[id^="DndLiveRegion"]');
  await page.getByRole('button', { name: 'Move Kite & Co' }).focus();
  await page.keyboard.press('Space');
  await expect(live).toContainText('Kite & Co is over New.');
  await page.keyboard.press('ArrowRight');
  await expect(live).toContainText('Kite & Co is over Contacted.');
  await page.keyboard.press('Space');

  await expect(contacted.getByText('Kite & Co')).toBeVisible();
  await expect(live).toContainText('Kite & Co moved to Contacted.');
});

test('keeps the keys pressed straight after picking a card up, on a slow phone', async ({
  page,
}) => {
  await page.goto('/iframe.html?id=patterns--board&viewMode=story');
  const move = page.getByRole('button', { name: 'Move Kite & Co' });
  await move.waitFor();
  // About a low-cost Android phone: here the arrow used to arrive before the board listened.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 });
  await move.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');

  const live = page.locator('[id^="DndLiveRegion"]');
  await expect(live).toContainText('Kite & Co moved to Contacted.', { timeout: 15_000 });
  await expect(
    page.getByRole('region', { name: /Contacted/ }).getByText('Kite & Co'),
  ).toBeVisible();
});

test('opens a row from the command palette with the keyboard', async ({ page }) => {
  await page.goto('/iframe.html?id=patterns--command&viewMode=story');
  const input = page.getByRole('combobox');
  await expect(input).toHaveValue('kite');
  await input.fill('invoice');
  await expect(page.getByRole('option', { name: /Create invoice/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
