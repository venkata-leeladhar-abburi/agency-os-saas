import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/proxy';

const SIGNED_IN_ONLY = ['/app', '/setup'];

/** Keeps sign-in fresh and sends signed-out visitors to sign in. Real checks happen again in each page and action. */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && SIGNED_IN_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const to = new URL('/sign-in', request.url);
    to.searchParams.set('next', pathname + search);
    return NextResponse.redirect(to);
  }
  if (signedIn && pathname === '/sign-in')
    return NextResponse.redirect(new URL('/app', request.url));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|prototype|api/health|api/webhooks).*)'],
};
