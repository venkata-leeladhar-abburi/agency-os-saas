import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  schemaFilter: ['public'],
  dbCredentials: {
    url:
      process.env.DATABASE_URL_DIRECT ?? 'postgresql://postgres:postgres@localhost:5432/agency_os',
  },
});
