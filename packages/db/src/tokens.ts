import { createHash, randomBytes } from 'node:crypto';

/** A 128-bit-plus random token for links (invites, public proposals). Only its hash is stored. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
