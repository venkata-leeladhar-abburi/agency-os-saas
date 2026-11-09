'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { twoFactorEnabled } from '@/lib/auth/helpers';
import { confirmTwoFactor, startTwoFactor, turnOffTwoFactor } from '@/lib/auth/two-factor';
import { exampleMode } from '@/lib/data';
import { saveProfile } from '@/lib/data/profile';
import { checkProfile, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';
import { callerIp } from '@/lib/origin';
import { allow } from '@/lib/rate-limit';
import { supabaseServer } from '@/lib/supabase/server';

export async function saveProfileAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkProfile(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const result = await saveProfile(checked.value, slug);
  if (result.error) return { errors: { [result.field ?? 'name']: result.error }, values: f };
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}

/**
 * Ends every session you have, on every device, this one included (D-068). Each device asks
 * for a new sign-in link the next time it opens a page.
 */
export async function signOutEverywhereAction() {
  if (exampleMode()) return;
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/sign-in?signed-out=everywhere');
}

export type TwoFactorState = {
  /** While setting up: the factor being added, and its QR code and key. */
  setup?: { factorId: string; qrCode: string; secret: string };
  error?: string;
  /** Whether two-factor is on after this step. */
  on?: boolean;
};

/** Starts setting up two-factor login: a QR code for the authenticator app. */
export async function startTwoFactorAction(): Promise<TwoFactorState> {
  if (!twoFactorEnabled() || exampleMode()) return {};
  const started = await startTwoFactor();
  if (!started.ok) return { error: started.error };
  const { factorId, qrCode, secret } = started;
  return { setup: { factorId, qrCode, secret } };
}

/** Finishes setting up with the first code from the app. */
export async function confirmTwoFactorAction(
  setup: NonNullable<TwoFactorState['setup']>,
  _prev: TwoFactorState,
  form: FormData,
): Promise<TwoFactorState> {
  if (!(await allow('twoFactorTries', await callerIp())))
    return { setup, error: 'Too many tries. Wait 10 minutes, then try again.' };
  const result = await confirmTwoFactor(setup.factorId, String(form.get('code') ?? ''));
  return result.ok ? { on: true } : { setup, error: result.error };
}

/** Turns two-factor login off, with a current code. */
export async function turnOffTwoFactorAction(
  _prev: TwoFactorState,
  form: FormData,
): Promise<TwoFactorState> {
  if (!(await allow('twoFactorTries', await callerIp())))
    return { on: true, error: 'Too many tries. Wait 10 minutes, then try again.' };
  const result = await turnOffTwoFactor(String(form.get('code') ?? ''));
  return result.ok ? { on: false } : { on: true, error: result.error };
}
