import { pingDatabase } from '@agency-os/db';
import { database } from '../../../lib/server/db';

export const dynamic = 'force-dynamic';

/** Liveness and the database check (architecture.md, observability). */
export async function GET() {
  const db = database();
  if (!db) return Response.json({ ok: true, database: 'not configured' });
  const up = await pingDatabase(db);
  return Response.json({ ok: up, database: up ? 'ok' : 'unreachable' }, { status: up ? 200 : 503 });
}
