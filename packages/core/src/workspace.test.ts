import { describe, expect, it } from 'vitest';
import {
  initialsPrefix,
  inviteExpiry,
  slugify,
  SUPPORTED_COUNTRIES,
  workspaceDefaults,
} from './workspace';

describe('workspace defaults', () => {
  it('sets INR, en-IN and IST for India', () => {
    expect(workspaceDefaults('in')).toEqual({
      currency: 'INR',
      locale: 'en-IN',
      timeZone: 'Asia/Kolkata',
    });
    expect(SUPPORTED_COUNTRIES).toContain('GB');
  });

  it('refuses a country without defaults', () => {
    expect(() => workspaceDefaults('ZZ')).toThrow(RangeError);
  });
});

describe('slugify and prefix', () => {
  it('builds a URL address from the name', () => {
    expect(slugify('One Stop Solutions')).toBe('one-stop-solutions');
    expect(slugify('Kite & Co.')).toBe('kite-and-co');
    expect(slugify('Café Studio')).toBe('cafe-studio');
    expect(slugify('***')).toBe('workspace');
    expect(slugify('a'.repeat(60)).length).toBe(48);
  });

  it('builds an invoice prefix from the initials', () => {
    expect(initialsPrefix('One Stop Solutions')).toBe('OSS');
    expect(initialsPrefix('—')).toBe('INV');
  });

  it('expires invitations after 7 days', () => {
    const from = new Date('2026-10-26T10:00:00Z');
    expect(inviteExpiry(from).toISOString()).toBe('2026-11-02T10:00:00.000Z');
  });
});
