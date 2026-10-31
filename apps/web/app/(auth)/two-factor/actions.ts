'use server';

import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/auth/helpers';
import { verifySignInCode } from '@/lib/auth/two-factor';
import { callerIp } from '@/lib/origin';
import { allow } from '@/lib/rate-limit';
import { supabaseServer } from '@/lib/supabase/server';

export type CodeState = { error?: string };

export async function verifyCodeAction(_prev: CodeState, form: FormData): Promise<CodeState> {
  if (!(await allow('twoFactorTries', await callerIp())))
    return { error: 'Too many tries. Wait 10 minutes, then try again.' };
  const result = await verifySignInCode(String(form.get('code') ?? ''));
  if (!result.ok) return { error: result.error };
  redirect(safeNext(String(form.get('next') ?? '')));
}

/** For someone without their phone: back to sign-in, signed out. */
export async function signOutAction() {
  await (await supabaseServer()).auth.signOut();
  redirect('/sign-in');
}
