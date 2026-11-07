// Server only. Two-factor login with an authenticator app, through Supabase Auth (D-071).
// Supabase keeps the secret; we never see more than the QR code shown once while setting up.
import { supabaseServer } from '../supabase/server';
import { totpCode } from './helpers';

export type TwoFactorResult = { ok: true } | { ok: false; error: string };

const WRONG_CODE =
  'That code didn’t work. Check the time on your phone, then enter the newest code.';
const TRY_AGAIN = 'That didn’t work. Try again in a minute.';
const NOT_A_CODE = 'Enter the 6-digit code from your authenticator app.';

async function mfa() {
  return (await supabaseServer()).auth.mfa;
}

/** The person's authenticator, once set up and checked. */
async function verifiedFactor(): Promise<string | null> {
  const { data, error } = await (await mfa()).listFactors();
  if (error) return null;
  return data.totp.find((f) => f.status === 'verified')?.id ?? null;
}

/** Whether two-factor login is on for the signed-in person. */
export async function twoFactorOn(): Promise<boolean> {
  return (await verifiedFactor()) !== null;
}

/**
 * Starts setting up: a QR code (and the key, for typing in) for the authenticator app. A
 * set-up that was started but never finished is cleared first.
 */
export async function startTwoFactor(): Promise<
  { ok: true; factorId: string; qrCode: string; secret: string } | { ok: false; error: string }
> {
  const api = await mfa();
  const { data: listed } = await api.listFactors();
  for (const f of listed?.all ?? [])
    if (f.factor_type === 'totp' && f.status === 'unverified')
      await api.unenroll({ factorId: f.id });
  const { data, error } = await api.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator app',
  });
  if (error || !data) return { ok: false, error: TRY_AGAIN };
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Finishes setting up with the first code from the app; from now on sign-in asks for one. */
export async function confirmTwoFactor(factorId: string, input: string): Promise<TwoFactorResult> {
  const code = totpCode(input);
  if (!code) return { ok: false, error: NOT_A_CODE };
  const { error } = await (await mfa()).challengeAndVerify({ factorId, code });
  return error ? { ok: false, error: WRONG_CODE } : { ok: true };
}

/** The second step of signing in. */
export async function verifySignInCode(input: string): Promise<TwoFactorResult> {
  const code = totpCode(input);
  if (!code) return { ok: false, error: NOT_A_CODE };
  const factorId = await verifiedFactor();
  if (!factorId) return { ok: true }; // Nothing to check: two-factor isn't on.
  const { error } = await (await mfa()).challengeAndVerify({ factorId, code });
  return error ? { ok: false, error: WRONG_CODE } : { ok: true };
}

/** Turns it off, with a current code so a borrowed session can't. */
export async function turnOffTwoFactor(input: string): Promise<TwoFactorResult> {
  const code = totpCode(input);
  if (!code) return { ok: false, error: NOT_A_CODE };
  const factorId = await verifiedFactor();
  if (!factorId) return { ok: true };
  const api = await mfa();
  const checked = await api.challengeAndVerify({ factorId, code });
  if (checked.error) return { ok: false, error: WRONG_CODE };
  const { error } = await api.unenroll({ factorId });
  return error ? { ok: false, error: TRY_AGAIN } : { ok: true };
}
