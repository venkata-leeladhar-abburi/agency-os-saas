import { NextResponse, type NextRequest } from 'next/server';
import { EXAMPLE_SLUG, exampleMode } from '@/lib/data';
import { portalSession } from '@/lib/data/portal';
import { database } from '@/lib/server/db';
import { PORTAL_COOKIE, portalCtxFor } from '@/lib/server/portal';
import { currentUser } from '@/lib/supabase/server';

/** Whether this client can be chosen: their own (database), or an example client (example mode). */
async function allowed(workspace: string, client: string) {
  if (exampleMode()) return workspace === EXAMPLE_SLUG && Boolean(await portalSession(client));
  const user = await currentUser();
  const db = database();
  if (!user || !db) return false;
  const pc = await portalCtxFor(db, { userId: user.id, email: user.email }, workspace, client);
  return pc?.clientId === client;
}

/**
 * Looks at the portal as one of the clients: a contact for several of the agency's clients
 * switches between them; in example mode the agency can look as any example client.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspace: string; client: string }> },
) {
  const { workspace, client } = await params;
  if (!(await allowed(workspace, client))) return new NextResponse('Not found', { status: 404 });
  const response = NextResponse.redirect(new URL(`/p/${workspace}`, request.url));
  response.cookies.set(PORTAL_COOKIE, client, { path: '/p', httpOnly: true, sameSite: 'lax' });
  return response;
}
