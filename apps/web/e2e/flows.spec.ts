import { expect, test, type Page } from '@playwright/test';

// The usability tasks T1 to T10 (docs/01-research/usability-testing.md) can be clicked through.
const go = (page: Page, slug: string) => page.goto(`/prototype/${slug}`);
const click = (page: Page, name: string | RegExp) =>
  page.getByRole('link', { name }).first().click();
const at = (page: Page, slug: string, state?: string) =>
  expect(page).toHaveURL(new RegExp(`/prototype/${slug}${state ? `\\?state=${state}` : ''}$`));

test('T1 sign up and set up the workspace', async ({ page }) => {
  await go(page, 's01-sign-in');
  await click(page, 'Email me a sign-in link');
  await at(page, 's01-sign-in', 'sent');
  await go(page, 's02-workspace-setup');
  await click(page, 'Continue');
  await at(page, 's02-workspace-setup', 'step-2');
  await click(page, 'Continue');
  await at(page, 's02-workspace-setup', 'step-3');
  await click(page, 'Continue');
  await at(page, 's03-onboarding');
});

test('T2 add a lead with a follow-up', async ({ page }) => {
  await go(page, 's12-leads-board');
  await click(page, 'Add lead');
  await at(page, 's15-new-lead');
  await expect(page.getByLabel('Follow-up')).toBeVisible();
  await click(page, 'Add lead');
  await at(page, 's12-leads-board');
});

test('T3 send a lead a quote with GST', async ({ page }) => {
  await go(page, 's12-leads-board');
  await page.getByRole('button', { name: 'Northwind', exact: true }).first().click();
  await at(page, 's14-lead-record');
  await click(page, 'Create quote');
  await at(page, 's18-quote-builder');
  await expect(page.getByText('IGST 18%')).toBeVisible();
  await click(page, 'Save and send');
  await expect(page.getByRole('dialog', { name: /Send the proposal/ })).toBeVisible();
});

test('T4 make the lead a client and invite them', async ({ page }) => {
  await go(page, 's14-lead-record');
  await click(page, 'Mark as won');
  await at(page, 's21-convert-lead');
  await expect(
    page.getByRole('checkbox', { name: /Invite Kiran to the client portal/ }),
  ).toBeChecked();
  await click(page, 'Create client');
  await at(page, 's23-client-record', 'invite');
});

test('T5 start a project from the usual process', async ({ page }) => {
  await go(page, 's24-projects');
  await click(page, 'New project');
  await at(page, 's25-new-project');
  await expect(page.getByRole('radio', { name: /Seven phases/ })).toBeChecked();
  await click(page, 'Create project');
  await at(page, 's26-project-overview');
});

test('T6 ask the client to approve the designs', async ({ page }) => {
  await go(page, 's26-project-overview');
  await click(page, 'Request approval');
  await at(page, 's27-phases', 'request');
  await expect(page.getByRole('dialog', { name: /approve the design/ })).toBeVisible();
});

test('T7 client approves the design on a phone', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await go(page, 's38-portal-home');
  await page.getByRole('link', { name: /Approve the dashboard design/ }).click();
  await at(page, 's39-portal-project');
  await page.getByRole('button', { name: 'Approve' }).click();
  await at(page, 's39-portal-project', 'approved');
  await expect(page.getByText(/Approved by/)).toBeVisible();
  await context.close();
});

test('T8 client pays the advance', async ({ page }) => {
  await go(page, 's38-portal-home');
  await page.getByRole('link', { name: /Pay ₹47,200/ }).click();
  await at(page, 's40-portal-invoices');
  await click(page, 'Pay ₹47,200');
  await at(page, 's40-portal-invoices', 'paying');
  await expect(page.getByRole('radio', { name: /UPI/ })).toBeChecked();
  await click(page, 'Pay ₹47,200');
  await at(page, 's40-portal-invoices', 'success');
});

test('T9 bill a US client as an export invoice under LUT', async ({ page }) => {
  await go(page, 's32-invoices');
  await click(page, 'Create invoice');
  await at(page, 's33-invoice-builder');
  await page.getByLabel('Type', { exact: true }).selectOption('Export under LUT');
  await at(page, 's33-invoice-builder', 'export');
  await expect(page.getByText(/export under LUT ARN/)).toBeVisible();
  await expect(page.getByText('$2,000.00').first()).toBeVisible();
});

test('T10 overdue money and the project at risk are on the dashboard', async ({ page }) => {
  await go(page, 's11-dashboard');
  await expect(page.getByRole('link', { name: /Overdue.*₹38,500/ })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Projects at risk' })).toContainText('Acme Labs');
});

test('T12 a team member posts the daily update from a phone', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await go(page, 's37-my-day');
  await page.getByLabel('Done', { exact: true }).fill('Checkout API fix');
  await click(page, 'Post update');
  await at(page, 's37-my-day', 'posted');
  await expect(page.getByText('Update posted')).toBeVisible();
  await context.close();
});
