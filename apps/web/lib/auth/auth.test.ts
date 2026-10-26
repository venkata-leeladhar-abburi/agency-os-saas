import { describe, expect, it } from 'vitest';
import { supabaseUrl } from '../supabase/url';
import { cleanEmail } from './email';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/app/leads?stage=won')).toBe('/app/leads?stage=won');
    expect(safeNext('/invite/abc')).toBe('/invite/abc');
  });
  it('falls back for anything that could leave the site', () => {
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'app',
      '',
      null,
    ])
      expect(safeNext(bad as string | null)).toBe('/app');
    expect(safeNext('javascript:alert(1)', '/setup')).toBe('/setup');
  });
});

describe('cleanEmail', () => {
  it('trims and lower-cases', () => {
    expect(cleanEmail('  Kiran@OneStop.in ')).toBe('kiran@onestop.in');
  });
  it('rejects things that are not emails', () => {
    for (const bad of ['', 'kiran', 'kiran@', 'a b@c.in', 42, undefined])
      expect(cleanEmail(bad)).toBeUndefined();
  });
});

describe('supabaseUrl', () => {
  it('reduces a pasted REST address to the project origin', () => {
    expect(supabaseUrl('https://abc.supabase.co/rest/v1/')).toBe('https://abc.supabase.co');
    expect(supabaseUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
  });
  it('returns nothing for a missing or broken value', () => {
    expect(supabaseUrl('')).toBeUndefined();
    expect(supabaseUrl('not a url')).toBeUndefined();
  });
});
