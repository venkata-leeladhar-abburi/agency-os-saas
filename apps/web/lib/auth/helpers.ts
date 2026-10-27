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

/**
 * Something before one @, and a domain with a dot that has a character before it and two
 * after. Checked by hand, not by one regex, so long inputs can't make it backtrack.
 */
export function isEmail(input: string): boolean {
  const s = input.trim();
  const at = s.indexOf('@');
  if (at < 1 || at !== s.lastIndexOf('@') || /\s/.test(s)) return false;
  const domain = s.slice(at + 1);
  for (let i = 1; i <= domain.length - 3; i++) if (domain[i] === '.') return true;
  return false;
}

/** Phone sign-in stays off until the SMS provider is set up (build plan M5). */
export function phoneOtpEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PHONE_OTP === 'true';
}

/** +919014952056 → "+91 90149 52056" (content-style.md); other numbers are shown as stored. */
export function formatPhone(phone: string): string {
  const m = /^\+91([6-9]\d{4})(\d{5})$/.exec(phone);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}
