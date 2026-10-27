import { createHash } from 'node:crypto';

// Server only. Rate limits for public endpoints (security-and-compliance.md): a fixed window
// per key. With UPSTASH_REDIS_REST_URL and _TOKEN set, counts live in Upstash Redis and are
// shared by every server; without them, in this server's memory (enough for one instance and
// for development).

export type Limit = { max: number; windowMs: number };

/** The limits, in one place so they can be read and changed together. */
export const LIMITS = {
  /** Signing codes for one proposal: each one is an email to the client. */
  signingCodeRequests: { max: 5, windowMs: 60 * 60_000 },
  /** Code requests and signing tries from one network, across proposals. */
  signingFromNetwork: { max: 30, windowMs: 60 * 60_000 },
  /** Enquiries from one network, so a form left open to bots can't flood the board. */
  enquiries: { max: 5, windowMs: 60_000 },
  /** Links that open nothing, from one network: slows guessing of tokens. */
  unknownLinks: { max: 20, windowMs: 10 * 60_000 },
} satisfies Record<string, Limit>;

type Store = Map<string, { count: number; resetAt: number }>;
const g = globalThis as unknown as { __agencyOsRateLimits?: Store };

function memoryHit(key: string, limit: Limit, now: number): number {
  const store = (g.__agencyOsRateLimits ??= new Map());
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + limit.windowMs });
    return 1;
  }
  entry.count++;
  return entry.count;
}

async function upstashHit(key: string, limit: Limit): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, String(limit.windowMs), 'NX'],
      ]),
    });
    if (!res.ok) return null;
    const [incr] = (await res.json()) as [{ result: number }];
    return incr.result;
  } catch {
    // Redis down: fall back to memory rather than block every visitor.
    return null;
  }
}

/**
 * The stored key: the id (an IP address, a link token) is hashed, so nothing from the request
 * goes into the Redis URL and no raw IPs are kept.
 */
function keyOf(bucket: keyof typeof LIMITS, id: string) {
  return `rl:${bucket}:${createHash('sha256').update(id).digest('hex').slice(0, 32)}`;
}

/** Counts one hit; true while the key is within its limit. */
export async function allow(
  bucket: keyof typeof LIMITS,
  id: string,
  now = Date.now(),
): Promise<boolean> {
  const limit = LIMITS[bucket];
  const key = keyOf(bucket, id);
  const count = (await upstashHit(key, limit)) ?? memoryHit(key, limit, now);
  return count <= limit.max;
}

/** Has the key used up its limit? Reads without counting a hit. */
export async function exhausted(
  bucket: keyof typeof LIMITS,
  id: string,
  now = Date.now(),
): Promise<boolean> {
  const key = keyOf(bucket, id);
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const res = await fetch(`${url}/get/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { result } = (await res.json()) as { result: string | null };
        return Number(result ?? 0) >= LIMITS[bucket].max;
      }
    } catch {
      // Fall through to memory.
    }
  }
  const entry = g.__agencyOsRateLimits?.get(key);
  return Boolean(entry && entry.resetAt > now && entry.count >= LIMITS[bucket].max);
}

export function resetRateLimits() {
  g.__agencyOsRateLimits?.clear();
}
