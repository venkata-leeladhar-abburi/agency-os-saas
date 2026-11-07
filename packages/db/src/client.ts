import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type Connection = { db: Db; close: () => Promise<void> };

/** Connects with a pooled URL (DATABASE_URL). Server code only. */
export function connect(url = process.env.DATABASE_URL): Connection {
  if (!url)
    throw new Error(
      'DATABASE_URL is not set. Add it to the environment (see docs/04-engineering/environments-and-deploy.md).',
    );
  // Fail in seconds, not the driver's 30, when the database can't be reached.
  const client = postgres(url, { max: 5, prepare: false, connect_timeout: 10 });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

/** The signed-in user, as Supabase puts it in the JWT. */
export type Session = { userId: string; email?: string | null; role?: 'authenticated' };

/**
 * The only way app code gets a database handle: a transaction that runs as the signed-in user,
 * so Postgres applies row-level security exactly as Supabase's own client would.
 */
export async function withUser<T>(
  db: Db,
  session: Session,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({
    sub: session.userId,
    email: session.email ?? undefined,
    role: 'authenticated',
  });
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}

/**
 * For jobs and webhooks only: runs as the service role (RLS bypassed), always for one workspace.
 * Callers get the workspace id back and must filter by it; never reaches the browser.
 */
export async function withService<T>(
  db: Db,
  workspaceId: string,
  fn: (tx: Tx, workspaceId: string) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) throw new Error('withService needs a workspace id');
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role service_role`);
    await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true)`);
    return fn(tx, workspaceId);
  });
}

/** For /api/health: can we reach the database? */
export async function pingDatabase(db: Db): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
