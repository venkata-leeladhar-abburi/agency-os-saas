import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('signed-out visitors to the app go to sign-in and come back after', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp$/);
  await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
});

test('setup and invite pages also need sign-in', async ({ page }) => {
  await page.goto('/setup');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsetup$/);
  await page.goto('/invite/some-token');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finvite%2Fsome-token$/);
});

test('sign-in page has the Google and email options and no accessibility violations', async ({
  page,
}) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('a bad email says how to fix it', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill('kiran');
  // The browser's own check would stop a submit, so go around it to test the server message.
  await page.evaluate(() =>
    document.querySelectorAll('form').forEach((f) => (f.noValidate = true)),
  );
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(
    page.getByText('Check your email address. It should look like you@agency.in.'),
  ).toBeVisible();
});

test('an expired link shows the expired message', async ({ page }) => {
  await page.goto('/sign-in?error=link');
  await expect(page.getByText('This sign-in link has expired')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('sign-in does not redirect to another site', async ({ page }) => {
  await page.goto('/sign-in?next=https://evil.example');
  await expect(page.locator('input[name="next"]').first()).toHaveValue('/app');
});
