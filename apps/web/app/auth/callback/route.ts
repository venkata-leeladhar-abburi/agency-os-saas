import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/helpers';
import { supabaseServer } from '@/lib/supabase/server';

/** Where the email link and Google send people back: swap the code for a session, then carry on. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get('next'));
  const code = searchParams.get('code');
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/sign-in?error=expired&next=${encodeURIComponent(next)}`);
}
