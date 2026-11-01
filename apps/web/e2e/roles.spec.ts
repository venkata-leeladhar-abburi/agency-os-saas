import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const VIEWS = [
  { button: 'Open the owner dashboard', heading: 'Good morning, Kiran', person: 'Kiran Rao' },
  { button: 'Open the project lead view', heading: 'Good morning, Ananya', person: 'Ananya Iyer' },
  { button: 'Open the team member view', heading: 'Good morning, Arjun', person: 'Arjun Mehta' },
  { button: 'Open the finance view', heading: 'Invoices', person: 'Meera Pillai' },
];

test('home page offers a view per role with no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Choose a view' })).toBeVisible();
  for (const name of ['Owner', 'Project lead', 'Team member', 'Finance', 'Client']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

for (const view of VIEWS) {
  test(`${view.button} opens that role's home`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: view.button }).click();
    await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
    await expect(page.getByText(view.person).first()).toBeVisible();
  });
}

test('the chosen role stays while moving around the app', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open the team member view' }).click();
  await expect(page.getByText('Arjun Mehta').first()).toBeVisible();
  // Projects is owned by the owner role on its own; the member view keeps the member sidebar.
  await page.goto('/prototype/s24-projects');
  await expect(page.getByText('Arjun Mehta').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /My tasks/ })).toBeVisible();
});

test('the client view opens the client portal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open the client portal' }).click();
  await expect(page).toHaveURL(/s38-portal-home/);
  await expect(page.getByRole('link', { name: 'Payments' }).first()).toBeVisible();
});
