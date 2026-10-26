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
      // Reduced motion removes transitions, so axe never measures a colour mid-change.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
      await expect(page.locator('#storybook-root > *').first()).toBeAttached();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.evaluate(() => document.fonts.ready);
      // Storybook may render again after applying globals; wait until the story stops changing
      // so axe never measures a half-rendered or half-themed page.
      await page.waitForLoadState('networkidle');
      await page.waitForFunction(
        () =>
          new Promise<boolean>((resolve) => {
            const root = document.querySelector('#storybook-root')!;
            let last = root.innerHTML;
            let still = 0;
            const tick = () => {
              const now = root.innerHTML;
              still = now === last ? still + 1 : 0;
              last = now;
              if (still >= 10) resolve(true);
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );
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
