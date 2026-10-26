import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The screen list comes from the prototype index itself, so a new screen is checked automatically.
test.describe.configure({ mode: 'parallel' });

async function serious(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

test('the index lists all 42 R0 and R1 screens', async ({ page }) => {
  await page.goto('/prototype');
  await expect(page.getByRole('heading', { name: 'Prototype', level: 1 })).toBeVisible();
  const links = page.locator('main a[href^="/prototype/s"]');
  await expect(links).toHaveCount(42);
  expect(await serious(page)).toEqual([]);
});

const SLUGS = [
  's01-sign-in',
  's02-workspace-setup',
  's03-onboarding',
  's04-app-shell',
  's05-command-palette',
  's06-notifications',
  's07-settings',
  's08-invite',
  's09-plan-limit',
  's10-today',
  's11-dashboard',
  's12-leads-board',
  's13-leads-table',
  's14-lead-record',
  's15-new-lead',
  's16-csv-import',
  's17-enquiry-form',
  's18-quote-builder',
  's19-proposal-builder',
  's20-proposal-view',
  's21-convert-lead',
  's22-clients',
  's23-client-record',
  's24-projects',
  's25-new-project',
  's26-project-overview',
  's27-phases',
  's28-tasks',
  's29-task-detail',
  's30-files',
  's31-messages',
  's32-invoices',
  's33-invoice-builder',
  's34-invoice-pay',
  's35-record-payment',
  's36-team',
  's37-my-day',
  's38-portal-home',
  's39-portal-project',
  's40-portal-invoices',
  's41-portal-messages',
  's42-portal-account',
];

for (const slug of SLUGS) {
  test(`${slug}: every state renders with no serious accessibility violations`, async ({
    page,
    browser,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/prototype/${slug}`);
    // A dialog open on load hides the rest of the page from assistive technology, so find the controls by label.
    await expect(page.locator('aside[aria-label="Prototype controls"]')).toBeVisible();
    const states = await page
      .locator('#state option')
      .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
    expect(states.length).toBeGreaterThan(0);
    for (const state of states) {
      await page.goto(`/prototype/${slug}?state=${state}`);
      await expect(page.locator('#state')).toHaveValue(state);
      expect(await serious(page), `${slug} ${state}`).toEqual([]);
    }
    // Phones: nothing wider than the screen (boards scroll inside their own region).
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phonePage = await phone.newPage();
    await phonePage.goto(`/prototype/${slug}?chrome=0`);
    // The page, and every scrolling main area, must fit; boards scroll inside their own region.
    const width = await phonePage.evaluate(() =>
      Math.max(
        document.documentElement.scrollWidth,
        ...[...document.querySelectorAll('main')].map((m) => m.scrollWidth - m.clientWidth + 390),
      ),
    );
    expect(width, `${slug} is ${width}px wide on a 390px phone`).toBeLessThanOrEqual(390);
    await phone.close();
    // Dark theme, default state.
    const dark = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce' });
    const darkPage = await dark.newPage();
    await darkPage.goto(`/prototype/${slug}`);
    await expect(darkPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await serious(darkPage), `${slug} dark`).toEqual([]);
    await dark.close();
  });
}
