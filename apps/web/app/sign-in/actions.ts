'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cleanEmail } from '../../lib/auth/email';
import { safeNext } from '../../lib/auth/redirect';
import { appOrigin } from '../../lib/server/session';
import { supabaseServer } from '../../lib/supabase/server';

export type SignInState = { status: 'idle' | 'sent' | 'error'; email?: string; error?: string };

const NOT_SET_UP =
  'Sign-in isn’t set up on this server yet. Ask the owner to add the Supabase keys.';

function callbackUrl(origin: string, next: string) {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function emailLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = cleanEmail(formData.get('email'));
  if (!email)
    return {
      status: 'error',
      error: 'Check your email address. It should look like you@agency.in.',
    };

  const supabase = await supabaseServer();
  if (!supabase) return { status: 'error', email, error: NOT_SET_UP };

  const next = safeNext(String(formData.get('next') ?? ''));
  const origin = appOrigin(await headers());
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(origin, next) },
  });
  if (error) {
    const limited = error.status === 429 || error.code === 'over_email_send_rate_limit';
    return {
      status: 'error',
      email,
      error: limited
        ? 'We’ve sent a few links already. Wait a minute, then try again.'
        : 'We couldn’t send the link. Check your connection and try again.',
    };
  }
  return { status: 'sent', email };
}

export async function googleSignIn(formData: FormData) {
  const next = safeNext(String(formData.get('next') ?? ''));
  const supabase = await supabaseServer();
  if (!supabase) redirect('/sign-in?error=setup');
  const origin = appOrigin(await headers());
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(origin, next) },
  });
  if (error || !data.url) redirect(`/sign-in?error=google&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}
