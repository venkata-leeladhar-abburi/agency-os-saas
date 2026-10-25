import { describe, expect, it } from 'vitest';
import { financialYear, formatDate } from './dates';
import { gstinCheckCharacter, isValidStateCode, validateGstin } from './gstin';
import { formatInvoiceNumber, validateInvoicePrefix } from './numbering';

describe('K. GSTIN validation', () => {
  it('accepts valid GSTINs', () => {
    expect(validateGstin('37ABCDE1234F1ZZ')).toEqual({ ok: true, gstin: '37ABCDE1234F1ZZ', stateCode: '37' });
    expect(validateGstin('29ABCDE1234F1ZW')).toMatchObject({ ok: true, stateCode: '29' });
    expect(validateGstin('27AAPFU0939F1ZV')).toMatchObject({ ok: true });
  });
  it('upper-cases and strips spaces', () => {
    expect(validateGstin(' 37abcde1234f1zz ')).toMatchObject({ ok: true, gstin: '37ABCDE1234F1ZZ' });
  });
  it('explains each problem', () => {
    expect(validateGstin('37ABCDE1234F1ZA')).toEqual({
      ok: false,
      error: "This GSTIN's last character doesn't match. Check for a typo.",
    });
    expect(validateGstin('37ABCDE1234F1Z')).toEqual({ ok: false, error: 'A GSTIN has 15 characters. This one has 14.' });
    expect(validateGstin('99ABCDE1234F1ZZ')).toMatchObject({ ok: false, error: expect.stringContaining('state code') });
    expect(validateGstin('37ABCDE12345FZZ')).toMatchObject({ ok: false, error: expect.stringContaining('pattern') });
  });
  it('knows the state codes', () => {
    expect(isValidStateCode('01')).toBe(true);
    expect(isValidStateCode('38')).toBe(true);
    expect(isValidStateCode('97')).toBe(true);
    expect(isValidStateCode('00')).toBe(false);
    expect(isValidStateCode('39')).toBe(false);
    expect(gstinCheckCharacter('37ABCDE1234F1Z')).toBe('Z');
  });
});

describe('J. numbering and financial year', () => {
  it('uses April to March', () => {
    expect(financialYear('2027-03-31')).toBe('26-27');
    expect(financialYear('2027-04-01')).toBe('27-28');
    expect(financialYear(new Date('2026-10-25T06:00:00Z'))).toBe('26-27');
    // 31 Mar 2027 at 20:00 UTC is already 1 Apr in India.
    expect(financialYear(new Date('2027-03-31T20:00:00Z'))).toBe('27-28');
  });
  it('formats invoice numbers', () => {
    expect(formatInvoiceNumber('OSS', '2027-03-31', 14)).toBe('OSS/26-27/014');
    expect(formatInvoiceNumber('OSS', '2027-04-01', 1)).toBe('OSS/27-28/001');
    expect(() => formatInvoiceNumber('OSS', '2027-04-01', 0)).toThrow('Sequence');
  });
  it('rejects prefixes that make numbers longer than 16 characters', () => {
    expect(validateInvoicePrefix('OSS')).toEqual({ ok: true });
    expect(validateInvoicePrefix('ONESTOP')).toMatchObject({ ok: false, error: expect.stringContaining('6 characters') });
    expect(validateInvoicePrefix('OS S')).toMatchObject({ ok: false });
  });
});

describe('M. dates', () => {
  it('writes the month', () => {
    expect(formatDate('2026-10-25')).toBe('25 Oct 2026');
    expect(formatDate('2026-10-25', { locale: 'en-US' })).toBe('Oct 25, 2026');
    expect(formatDate('2026-10-25', { locale: 'en-GB' })).toBe('25 Oct 2026');
    expect(formatDate('2026-09-25')).toBe('25 Sep 2026');
    expect(formatDate('2026-10-25', { year: false })).toBe('25 Oct');
  });
  it('shows timestamps in India time by default', () => {
    expect(formatDate(new Date('2026-10-24T20:00:00Z'))).toBe('25 Oct 2026');
    expect(formatDate(Date.UTC(2026, 9, 24, 20), { timeZone: 'Europe/London' })).toBe('24 Oct 2026');
  });
  it('rejects invalid dates', () => {
    expect(() => formatDate('not a date')).toThrow('Not a date');
  });
});
