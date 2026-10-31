/** Only follow same-site paths after sign-in, never a full URL someone put in the link. */
export function safeNext(next: string | null | undefined, fallback = '/home'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\'))
    return fallback;
  return next;
}

/** +91 numbers only for now: "90149 52056", "09014952056" and "+91 90149 52056" all become +919014952056. */
export function normaliseIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '');
  const m = /^(?:\+91|91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? `+91${m[1]}` : null;
}

/** Email check shared with the server and imports (linear, see packages/core). */
export { isEmail } from '@agency-os/core';

/** Phone sign-in stays off until the SMS provider is set up (build plan M5). */
export function phoneOtpEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PHONE_OTP === 'true';
}

/**
 * Two-factor login (authenticator app) can be turned on in Settings once this is set (D-071).
 * Off until it has been checked against the Supabase project; anyone who already has it is
 * still asked for their code either way.
 */
export function twoFactorEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TWO_FACTOR === 'true';
}

/** A code from an authenticator app: 6 digits, spaces allowed ("482 915"). */
export function totpCode(input: string): string | null {
  const code = input.replace(/\s/g, '');
  return /^\d{6}$/.test(code) ? code : null;
}

/**
 * Whether this session still owes its second step: the person has two-factor on (the next
 * level is aal2) and hasn't entered a code since signing in.
 */
export function needsSecondStep(aal: {
  currentLevel: string | null;
  nextLevel: string | null;
}): boolean {
  return aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2';
}

/** +919014952056 → "+91 90149 52056" (content-style.md); other numbers are shown as stored. */
export function formatPhone(phone: string): string {
  const m = /^\+91([6-9]\d{4})(\d{5})$/.exec(phone);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}
