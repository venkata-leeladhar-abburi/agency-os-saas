import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'node scripts/serve-static.mjs storybook-static 6007',
    url: 'http://localhost:6007/index.json',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:6007',
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
});
