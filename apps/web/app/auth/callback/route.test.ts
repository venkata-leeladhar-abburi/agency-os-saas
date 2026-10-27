import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = {
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({ supabaseServer: async () => ({ auth }) }));

const { GET } = await import('./route');
const call = async (query: string) =>
  (await GET(new NextRequest(`https://app.example/auth/callback?${query}`))).headers.get(
    'location',
  );

describe('auth callback', () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
    auth.verifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('signs in with a code and goes to the next page', async () => {
    expect(await call('code=abc&next=/w/one-stop')).toBe('https://app.example/w/one-stop');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('signs in with a token hash from another device', async () => {
    expect(await call('token_hash=h1&type=email')).toBe('https://app.example/home');
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'h1' });
  });

  it('sends a failed, malformed or empty link back to sign-in, never into the app', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('expired') });
    const expired = 'https://app.example/sign-in?error=expired&next=%2Fhome';
    expect(await call('code=old')).toBe(expired);
    expect(await call('token_hash=h1&type=admin')).toBe(expired);
    expect(await call('token_hash=h1')).toBe(expired);
    expect(await call('')).toBe(expired);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    auth.verifyOtp.mockResolvedValue({ error: new Error('used') });
    expect(await call('token_hash=h1&type=magiclink')).toBe(expired);
  });

  it('keeps the next page on this site', async () => {
    expect(await call('code=abc&next=//evil.example')).toBe('https://app.example/home');
  });
});
