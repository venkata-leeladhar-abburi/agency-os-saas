import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Entry = { id: string; title: string; name: string; type: 'story' | 'docs' };
const index = JSON.parse(readFileSync('storybook-static/index.json', 'utf8')) as {
  entries: Record<string, Entry>;
};
const stories = Object.values(index.entries).filter((e) => e.type === 'story');

for (const story of stories) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${story.title} / ${story.name} (${theme}) has no serious accessibility violations`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
      await expect(page.locator('#storybook-root > *').first()).toBeAttached();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.evaluate(() => document.fonts.ready);
      // The whole page, so portalled dialogs, menus and toasts are checked too.
      const results = await new AxeBuilder({ page }).exclude('#storybook-docs').analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${story.id}-${theme}.png`),
        fullPage: true,
      });
    });
  }
}
