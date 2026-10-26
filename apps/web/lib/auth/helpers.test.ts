import { describe, expect, it } from 'vitest';
import { isEmail, normaliseIndianPhone, safeNext } from './helpers';

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
  });
});
