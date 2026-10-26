import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, makeNonce, STATIC_SECURITY_HEADERS } from './security-headers';

describe('content security policy', () => {
  it('allows only this request’s scripts, and no framing', () => {
    const csp = contentSecurityPolicy('abc123');
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp.endsWith('upgrade-insecure-requests')).toBe(true);
  });
  it('lets the browser talk to Supabase, by origin only', () => {
    const csp = contentSecurityPolicy('n', { supabaseUrl: 'https://abcd.supabase.co/rest/v1' });
    expect(csp).toContain("connect-src 'self' https://abcd.supabase.co wss://abcd.supabase.co");
  });
  it('adds what the dev server needs only in development', () => {
    const csp = contentSecurityPolicy('n', { dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
  it('makes a different 128-bit nonce each time', () => {
    const a = makeNonce();
    expect(Buffer.from(a, 'base64')).toHaveLength(16);
    expect(makeNonce()).not.toBe(a);
  });
  it('sends HSTS and nosniff on everything', () => {
    const keys = STATIC_SECURITY_HEADERS.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'Referrer-Policy',
      ]),
    );
  });
});
