import { beforeEach, describe, expect, it, vi } from 'vitest';
import { needsSecondStep, totpCode } from './helpers';

const mfa = {
  listFactors: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challengeAndVerify: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({ supabaseServer: async () => ({ auth: { mfa } }) }));
vi.mock('../supabase/server', () => ({ supabaseServer: async () => ({ auth: { mfa } }) }));

const { confirmTwoFactor, startTwoFactor, turnOffTwoFactor, twoFactorOn, verifySignInCode } =
  await import('./two-factor');

const factor = (id: string, status: 'verified' | 'unverified') => ({
  id,
  status,
  factor_type: 'totp',
});
const factors = (...list: ReturnType<typeof factor>[]) =>
  mfa.listFactors.mockResolvedValue({
    data: { all: list, totp: list.filter((f) => f.status === 'verified') },
    error: null,
  });

describe('two-factor login', () => {
  beforeEach(() => {
    for (const fn of Object.values(mfa)) fn.mockReset();
    mfa.unenroll.mockResolvedValue({ error: null });
    mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    factors();
  });

  it('reads codes with spaces, and nothing else', () => {
    expect(totpCode(' 482 915 ')).toBe('482915');
    expect(totpCode('48291')).toBeNull();
    expect(totpCode('48291a')).toBeNull();
  });

  it('asks for the second step only when it is on and not yet done', () => {
    expect(needsSecondStep({ currentLevel: 'aal1', nextLevel: 'aal2' })).toBe(true);
    expect(needsSecondStep({ currentLevel: 'aal2', nextLevel: 'aal2' })).toBe(false);
    expect(needsSecondStep({ currentLevel: 'aal1', nextLevel: 'aal1' })).toBe(false);
  });

  it('sets up with a QR code, clearing a set-up that was never finished', async () => {
    factors(factor('old', 'unverified'));
    mfa.enroll.mockResolvedValue({
      data: {
        id: 'f1',
        totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABC', uri: 'otpauth://' },
      },
      error: null,
    });
    expect(await startTwoFactor()).toEqual({
      ok: true,
      factorId: 'f1',
      qrCode: 'data:image/svg+xml;utf-8,<svg/>',
      secret: 'ABC',
    });
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: 'old' });
    expect(mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Authenticator app',
    });
    mfa.enroll.mockResolvedValue({ data: null, error: new Error('mfa disabled') });
    expect(await startTwoFactor()).toMatchObject({ ok: false });
  });

  it('turns on only with a code the app made', async () => {
    expect(await confirmTwoFactor('f1', '12345')).toMatchObject({ ok: false });
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled();
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: new Error('invalid') });
    expect(await confirmTwoFactor('f1', '000000')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/didn’t work/),
    });
    expect(await confirmTwoFactor('f1', '482 915')).toEqual({ ok: true });
    expect(mfa.challengeAndVerify).toHaveBeenLastCalledWith({ factorId: 'f1', code: '482915' });
  });

  it('checks the sign-in code against the verified authenticator', async () => {
    expect(await twoFactorOn()).toBe(false);
    factors(factor('f1', 'verified'), factor('stale', 'unverified'));
    expect(await twoFactorOn()).toBe(true);
    expect(await verifySignInCode('482915')).toEqual({ ok: true });
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '482915' });
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: new Error('invalid') });
    expect(await verifySignInCode('111111')).toMatchObject({ ok: false });
  });

  it('turns off only after a current code', async () => {
    factors(factor('f1', 'verified'));
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: new Error('invalid') });
    expect(await turnOffTwoFactor('111111')).toMatchObject({ ok: false });
    expect(mfa.unenroll).not.toHaveBeenCalled();
    expect(await turnOffTwoFactor('482915')).toEqual({ ok: true });
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: 'f1' });
  });
});
