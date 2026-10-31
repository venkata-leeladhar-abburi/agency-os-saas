'use server';

import { redirect } from 'next/navigation';
import { isEmail, normaliseIndianPhone, phoneOtpEnabled, safeNext } from '@/lib/auth/helpers';
import { siteOrigin } from '@/lib/origin';
import { supabaseServer } from '@/lib/supabase/server';

export type SignInState = {
  step: 'start' | 'email-sent' | 'otp';
  error?: string;
  email?: string;
  phone?: string;
};

const RATE_LIMITED = 'Too many tries. Wait a minute, then try again.';

function describe(error: { message: string; status?: number }, fallback: string): string {
  if (error.status === 429 || /rate limit/i.test(error.message)) return RATE_LIMITED;
  return fallback;
}

export async function sendEmailLink(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const next = safeNext(String(form.get('next') ?? ''));
  if (!isEmail(email)) return { step: 'start', error: 'Enter an email like you@agency.in.', email };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error)
    return {
      step: 'start',
      error: describe(error, 'We couldn’t send the link. Check the address and try again.'),
      email,
    };
  return { step: 'email-sent', email };
}

export async function signInWithGoogle(form: FormData) {
  const next = safeNext(String(form.get('next') ?? ''));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/sign-in?error=oauth&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function sendPhoneCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  if (!phoneOtpEnabled())
    return { step: 'start', error: 'Phone sign-in isn’t available yet. Use email.' };
  const raw = String(form.get('phone') ?? '');
  const phone = normaliseIndianPhone(raw);
  if (!phone) return { step: 'start', error: 'Enter a 10-digit mobile number, like 90149 52056.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error)
    return {
      step: 'start',
      error: describe(error, 'We couldn’t send the code. Try again.'),
      phone: raw,
    };
  return { step: 'otp', phone };
}

export async function verifyPhoneCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  const phone = String(form.get('phone') ?? '');
  const token = String(form.get('code') ?? '').replace(/\s/g, '');
  const next = safeNext(String(form.get('next') ?? ''));
  if (!/^\d{6}$/.test(token)) return { step: 'otp', phone, error: 'The code has 6 digits.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error)
    return {
      step: 'otp',
      phone,
      error: describe(
        error,
        'That code doesn’t match or has expired. Check it or ask for a new one.',
      ),
    };
  redirect(next);
}
