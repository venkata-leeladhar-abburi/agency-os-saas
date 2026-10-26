const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns the trimmed, lower-cased address, or undefined when it can't be an email. */
export function cleanEmail(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : undefined;
}
