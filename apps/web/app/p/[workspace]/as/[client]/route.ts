import { NextResponse, type NextRequest } from 'next/server';
import { EXAMPLE_SLUG, exampleMode } from '@/lib/data';
import { portalSession } from '@/lib/data/portal';
import { PORTAL_COOKIE } from '@/lib/portal-session';

/** Example mode only: look at the portal as one of the example clients. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspace: string; client: string }> },
) {
  const { workspace, client } = await params;
  if (!exampleMode() || workspace !== EXAMPLE_SLUG || !(await portalSession(client)))
    return new NextResponse('Not found', { status: 404 });
  const response = NextResponse.redirect(new URL(`/p/${workspace}`, request.url));
  response.cookies.set(PORTAL_COOKIE, client, { path: '/p', httpOnly: true, sameSite: 'lax' });
  return response;
}
