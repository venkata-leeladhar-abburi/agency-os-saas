import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy, makeNonce } from './lib/security-headers';

/**
 * Every page: a fresh CSP nonce (Next adds it to its own scripts). Then, with Supabase set
 * up, keeps the session fresh and sends signed-out visitors to sign-in.
 */
export async function proxy(request: NextRequest) {
  const nonce = makeNonce();
  const csp = contentSecurityPolicy(nonce, {
    dev: process.env.NODE_ENV === 'development',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  // Routes that answer with their own document (the email preview, PDFs) set a stricter
  // policy themselves; the proxy's header would replace it.
  const ownPolicy = /\/(reminder|pdf)$/.test(request.nextUrl.pathname);
  const next = () => {
    const res = NextResponse.next({ request: { headers } });
    if (!ownPolicy) res.headers.set('Content-Security-Policy', csp);
    return res;
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXAMPLE_MODE === 'true') return next();
  let response = next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) {
            request.cookies.set(name, value);
            headers.set('cookie', request.cookies.toString());
          }
          response = next();
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPrivate = path === '/home' || path === '/setup' || /^\/w\//.test(path);
  if (!data.user && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|prototype|.*\\.(?:svg|png|jpg|ico)$).*)',
  ],
};
