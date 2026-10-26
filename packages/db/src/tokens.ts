import { createHash, randomBytes, randomInt } from 'node:crypto';

/** A 128-bit-plus random token for links (invites, public proposals). Only its hash is stored. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A 6-digit one-time code (for signing). Stored only as a hash bound to its record. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(code: string, recordId: string): string {
  return createHash('sha256').update(`${recordId}:${code}`).digest('hex');
}

/** SHA-256 of a value as JSON (bigints written as strings), for "what was signed". */
export function sha256Json(value: unknown): string {
  const json = JSON.stringify(value, (_key, v: unknown) =>
    typeof v === 'bigint' ? v.toString() : v,
  );
  return createHash('sha256').update(json).digest('hex');
}
