import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseKey, supabaseUrl } from './url';

/** Refreshes the sign-in cookies on every request and says who is signed in. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) return { response, signedIn: false };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return { response, signedIn: Boolean(data.user) };
}
