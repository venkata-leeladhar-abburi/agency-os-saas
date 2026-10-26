import { migrate as drizzleMigrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

export const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

/** Applies every migration in order (generated tables, then hand-written RLS). Forward-only. */
export async function migrate(url: string) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await drizzleMigrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end();
  }
}
