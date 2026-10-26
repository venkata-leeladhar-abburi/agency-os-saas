import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '../../../lib/auth/redirect';
import { supabaseServer } from '../../../lib/supabase/server';

/** Where the email link and Google send people back to: swap the one-time code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get('next'));
  const code = searchParams.get('code');
  const supabase = await supabaseServer();

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  const to = new URL('/sign-in', origin);
  to.searchParams.set('error', supabase ? 'link' : 'setup');
  to.searchParams.set('next', next);
  return NextResponse.redirect(to);
}
