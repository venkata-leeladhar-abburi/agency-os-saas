import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/helpers';
import { supabaseServer } from '@/lib/supabase/server';

const OTP_TYPES: EmailOtpType[] = [
  'magiclink',
  'email',
  'signup',
  'invite',
  'recovery',
  'email_change',
];

type Supabase = Awaited<ReturnType<typeof supabaseServer>>;

/** A link built from the token hash: checked by Supabase; anything malformed fails here. */
async function fromTokenHash(supabase: Supabase, params: URLSearchParams): Promise<boolean> {
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  if (!tokenHash || !type || !OTP_TYPES.includes(type)) return false;
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  return !error;
}

/** Google, or an email link opened in the browser that asked for it: a PKCE code. */
async function signIn(supabase: Supabase, params: URLSearchParams): Promise<boolean> {
  const code = params.get('code');
  if (!code) return fromTokenHash(supabase, params);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}

/**
 * Where the email link and Google send people back. Google and a link opened in the same
 * browser bring a `code`. An email link built from the token hash (Supabase's server-side
 * template) works on any device, so a link asked for on a laptop still opens on a phone.
 * Either way Supabase checks the token; the redirect into the app follows only a session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get('next'));
  if (await signIn(await supabaseServer(), searchParams))
    return NextResponse.redirect(`${origin}${next}`);
  return NextResponse.redirect(`${origin}/sign-in?error=expired&next=${encodeURIComponent(next)}`);
}
