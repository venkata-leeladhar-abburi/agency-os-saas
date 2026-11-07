import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allow, exhausted, LIMITS, resetRateLimits } from './rate-limit';

beforeEach(() => resetRateLimits());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('rate limits in memory', () => {
  it('allows up to the limit in a window, then refuses until it resets', async () => {
    const now = 1_000_000;
    const { max, windowMs } = LIMITS.signingCodeRequests;
    for (let i = 0; i < max; i++) expect(await allow('signingCodeRequests', 'tok', now)).toBe(true);
    expect(await allow('signingCodeRequests', 'tok', now)).toBe(false);
    expect(await exhausted('signingCodeRequests', 'tok', now)).toBe(true);
    // Another proposal is counted on its own.
    expect(await allow('signingCodeRequests', 'other', now)).toBe(true);
    expect(await allow('signingCodeRequests', 'tok', now + windowMs)).toBe(true);
    expect(await exhausted('signingCodeRequests', 'tok', now + windowMs)).toBe(false);
  });
});

describe('rate limits in Upstash', () => {
  it('counts in Redis when it is set up', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok');
    const fetch = vi.fn(async () => Response.json([{ result: 6 }, { result: 1 }]));
    vi.stubGlobal('fetch', fetch);
    expect(await allow('enquiries', '203.0.113.7')).toBe(false);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.upstash.io/pipeline');
    const [cmd, key] = JSON.parse(init.body as string)[0] as [string, string];
    expect(cmd).toBe('INCR');
    // The IP is hashed: nothing from the request goes to Redis as text.
    expect(key).toMatch(/^rl:enquiries:[0-9a-f]{32}$/);
    expect(key).not.toContain('203.0.113.7');
  });
  it('falls back to memory if Redis fails', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    expect(await allow('enquiries', 'x')).toBe(true);
  });
});
