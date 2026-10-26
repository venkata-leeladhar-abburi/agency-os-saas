import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { v7 as uuidv7 } from 'uuid';
import { connect, type Connection } from '../src/client';
import { migrate } from '../src/migrate';

const here = dirname(fileURLToPath(import.meta.url));
const ADMIN_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';

export type TestDb = Connection & {
  url: string;
  /** Creates a user in the auth shim (as Supabase Auth would) and returns its id. */
  createUser: (email: string) => Promise<string>;
  /** Runs SQL as the superuser, bypassing RLS, for arranging test data. */
  admin: postgres.Sql;
  drop: () => Promise<void>;
};

/** A fresh database with the Supabase shim and every migration applied. */
export async function createTestDb(): Promise<TestDb> {
  const name = `agency_os_test_${uuidv7().replace(/-/g, '').slice(-12)}`;
  const server = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  // A linguistic collation, as on most servers, so tests catch ordering that needs "C".
  await server.unsafe(
    `create database ${name} template template0 locale_provider icu icu_locale 'en-US' locale 'C.UTF-8'`,
  );
  await server.end();
  const url = ADMIN_URL.replace(/\/[^/]*$/, `/${name}`);
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  await admin.unsafe(readFileSync(resolve(here, 'supabase-shim.sql'), 'utf8'));
  await migrate(url);
  const conn = connect(url);
  return {
    ...conn,
    url,
    admin,
    createUser: async (email) => {
      const id = uuidv7();
      await admin`insert into auth.users (id, email) values (${id}, ${email})`;
      await admin`insert into profiles (id, full_name) values (${id}, ${email.split('@')[0]!})`;
      return id;
    },
    drop: async () => {
      await conn.close();
      await admin.end();
      const s = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
      await s.unsafe(`drop database if exists ${name} with (force)`);
      await s.end();
    },
  };
}
