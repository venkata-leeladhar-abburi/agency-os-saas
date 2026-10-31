import { pingDatabase } from '@agency-os/db';
import { database } from '../../../lib/server/db';

export const dynamic = 'force-dynamic';

/** Liveness and the database check (architecture.md, observability). */
export async function GET() {
  const db = database();
  if (!db) return Response.json({ ok: true, database: 'not configured' });
  // A health check must answer quickly even when the database doesn't.
  const up = await Promise.race([
    pingDatabase(db),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), 3_000)),
  ]);
  return Response.json({ ok: up, database: up ? 'ok' : 'unreachable' }, { status: up ? 200 : 503 });
}
