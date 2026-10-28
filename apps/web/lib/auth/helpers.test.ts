import { describe, expect, it } from 'vitest';
import { formatPhone, isEmail, normaliseIndianPhone, safeNext } from './helpers';

describe('safeNext', () => {
  it('keeps same-site paths', () => expect(safeNext('/acme/leads?x=1')).toBe('/acme/leads?x=1'));
  it.each(['https://evil.example', '//evil.example', '/\\evil', '', null, undefined])(
    'falls back for %s',
    (v) => expect(safeNext(v)).toBe('/home'),
  );
});

describe('normaliseIndianPhone', () => {
  it.each(['90149 52056', '09014952056', '+91 90149 52056', '919014952056'])('accepts %s', (v) =>
    expect(normaliseIndianPhone(v)).toBe('+919014952056'),
  );
  it.each(['12345', '+1 415 555 0100', '5014952056', ''])('rejects %s', (v) =>
    expect(normaliseIndianPhone(v)).toBeNull(),
  );
});

describe('isEmail', () => {
  it('accepts and rejects', () => {
    expect(isEmail(' kiran@onestop.in ')).toBe(true);
    expect(isEmail('kiran@')).toBe(false);
    expect(isEmail('a@b.cd.e')).toBe(true);
    for (const bad of [
      '@onestop.in',
      'kiran@onestop',
      'kiran@onestop.i',
      'ki ran@onestop.in',
      'a@b@c.in',
      'a@.in',
    ])
      expect(isEmail(bad)).toBe(false);
  });
  it('stays fast on long hostile input', () => {
    const started = performance.now();
    expect(isEmail(`a@${'b'.repeat(50_000)}`)).toBe(false);
    // Linear time takes a few milliseconds; backtracking would take seconds. The margin keeps
    // it steady on a busy CI runner.
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe('formatPhone', () => {
  it('spaces Indian mobiles and leaves others alone', () => {
    expect(formatPhone('+919014952056')).toBe('+91 90149 52056');
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });
});
