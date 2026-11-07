'use server';

import { redirect } from 'next/navigation';
import { appUrl, safeNext } from '../../../lib/supabase/env';
import { supabaseServer } from '../../../lib/supabase/server';

export type SignInState = { error?: string; sentTo?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const next = safeNext(String(form.get('next') ?? ''), '/home');
  if (!EMAIL.test(email))
    return { error: 'Check your email address. It should look like you@agency.in.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    return {
      error:
        error.status === 429
          ? 'Too many tries. Wait a minute, then send a new link.'
          : 'We couldn’t send the link. Check your connection and try again.',
    };
  }
  return { sentTo: email };
}

export async function signInWithGoogle(form: FormData) {
  const next = safeNext(String(form.get('next') ?? ''), '/home');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect('/sign-in?error=google');
  redirect(data.url);
}
