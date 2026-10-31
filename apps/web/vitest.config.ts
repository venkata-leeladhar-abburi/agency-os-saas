import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The same `@/` paths as tsconfig, so route handlers can be tested.
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts', 'app/**/*.test.ts', 'lib/**/*.test.{ts,tsx}'] },
});
