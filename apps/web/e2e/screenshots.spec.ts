import { test } from '@playwright/test';

// The G1/G2 screenshot set: every prototype screen in light and dark, at 390px and 1440px.
// Runs only when SCREENSHOTS=1 (CI uploads the folder as the "prototype-screenshots" artifact).
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture the screenshot set.');

const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
} as const;

test('capture every screen', async ({ browser }) => {
  test.setTimeout(15 * 60_000);
  const index = await browser.newPage();
  await index.goto('/prototype');
  const slugs = await index
    .locator('main a[href^="/prototype/s"]')
    .evaluateAll((links) =>
      links.map((a) => (a as HTMLAnchorElement).getAttribute('href')!.split('/').pop()!),
    );
  await index.close();
  for (const slug of slugs) {
    for (const theme of ['light', 'dark'] as const) {
      for (const [device, viewport] of Object.entries(VIEWPORTS)) {
        const context = await browser.newContext({
          viewport,
          colorScheme: theme,
          reducedMotion: 'reduce',
          isMobile: device === 'phone',
          hasTouch: device === 'phone',
        });
        const page = await context.newPage();
        await page.goto(`/prototype/${slug}?chrome=0`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `prototype-screenshots/${slug}-${theme}-${device}.png`,
          fullPage: true,
        });
        await context.close();
      }
    }
  }
});
