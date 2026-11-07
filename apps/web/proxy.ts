import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Public paths: everything else needs a signed-in user. */
const PUBLIC = [
  /^\/$/,
  /^\/sign-in/,
  /^\/auth\//,
  /^\/invite\//,
  /^\/api\//,
  /^\/prototype/,
  /^\/p\//,
  /^\/portal/,
  /^\/enquiry\//,
];

/** Refreshes the Supabase session cookie on every request and sends signed-out visitors to sign in. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!user && !PUBLIC.some((re) => re.test(pathname))) {
    const to = request.nextUrl.clone();
    to.pathname = '/sign-in';
    to.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)'],
};
