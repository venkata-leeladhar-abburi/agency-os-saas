// Server only: imported from route handlers and server components, never from client code.
import { connect, type Db } from '@agency-os/db';

let db: Db | undefined;

/** The shared connection, or undefined when DATABASE_URL is not set (local work without a database). */
export function database(): Db | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  db ??= connect(process.env.DATABASE_URL).db;
  return db;
}
