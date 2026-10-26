import { migrate } from './migrate.ts';

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL_DIRECT (or DATABASE_URL) to run migrations.');
  process.exit(1);
}
await migrate(url);
console.log('Migrations applied.');
