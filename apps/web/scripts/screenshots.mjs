// Captures the PR screenshot set: light and dark, phone (390px) and desktop (1440px).
// Usage: node scripts/screenshots.mjs <out-dir> name=url [name=url …]
// A URL containing {theme} gets the theme substituted (Storybook); otherwise the theme is
// stored the way the app's theme switch stores it.
/* global document -- used inside page.evaluate */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, ...pairs] = process.argv.slice(2);
if (!outDir || pairs.length === 0) {
  console.error('Usage: node scripts/screenshots.mjs <out-dir> name=url [name=url …]');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = {
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
for (const pair of pairs) {
  const [name, url] = [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)];
  for (const theme of ['light', 'dark']) {
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
      const { width, height, ...rest } = viewport;
      const context = await browser.newContext({
        viewport: { width, height },
        ...rest,
        colorScheme: theme,
      });
      if (!url.includes('{theme}')) {
        await context.addInitScript((t) => localStorage.setItem('theme', t), theme);
      }
      const page = await context.newPage();
      await page.goto(url.replace('{theme}', theme), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const file = join(outDir, `${name}-${theme}-${device}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
      await context.close();
    }
  }
}
await browser.close();
