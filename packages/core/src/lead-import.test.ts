import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';
import { guessLeadMapping, parseAmountText, toLeadImport } from './lead-import';

const file =
  '﻿Full name,Company,E-mail,Mobile,Lead source,Budget,Requirement,Status,Remarks\r\n' +
  'Example Person,Kite & Co,example@kite.example,+91 98765 43210,Instagram,"₹4.86 L",Website,New,"Wants a ""quick"" start"\r\n' +
  ',,,,,,,,\r\n' +
  'Nobody,,bad-email,,,lots,,,\n';

describe('CSV parsing', () => {
  it('reads quotes, escaped quotes, CRLF and LF, and skips blank rows', () => {
    const rows = parseCsv(file);
    expect(rows).toHaveLength(3);
    expect(rows[0]![0]).toBe('Full name');
    expect(rows[1]![8]).toBe('Wants a "quick" start');
    expect(parseCsv('a,"b\nc"\nd')).toEqual([['a', 'b\nc'], ['d']]);
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('x,y\r\n')).toEqual([['x', 'y']]);
  });
});

describe('lead import', () => {
  const [headers, good, bad] = parseCsv(file) as [string[], string[], string[]];
  const mapping = guessLeadMapping(headers);

  it('guesses the column mapping', () => {
    expect(mapping).toEqual({
      name: 0,
      company: 1,
      email: 2,
      phone: 3,
      source: 4,
      value: 5,
      service: 6,
      stage: 7,
      notes: 8,
    });
    expect(guessLeadMapping(['Something else'])).toEqual({});
  });

  it('turns a good row into a lead', () => {
    expect(toLeadImport(good, mapping, 'INR')).toEqual({
      ok: true,
      lead: {
        name: 'Example Person',
        company: 'Kite & Co',
        email: 'example@kite.example',
        phone: '+919876543210',
        source: 'instagram',
        valueMinor: 48_600_000n,
        service: 'Website',
        stage: 'New',
        notes: 'Wants a "quick" start',
      },
    });
  });

  it('says what to fix in a bad row', () => {
    expect(toLeadImport(bad, mapping, 'INR')).toEqual({
      ok: false,
      errors: [
        'Check the email "bad-email".',
        'Write the value as a number, like 4,86,000 or 4.86 L (was "lots").',
      ],
    });
    expect(
      toLeadImport(['', '', '', '12'], { name: 0, company: 1, email: 2, phone: 3 }, 'INR'),
    ).toEqual({
      ok: false,
      errors: ['Add a name or a company.', 'Check the phone number "12".'],
    });
    expect(toLeadImport(['A'], { name: 0 }, 'INR')).toEqual({
      ok: false,
      errors: ['Add an email or a phone number.'],
    });
  });

  it('uses the company when there is no name', () => {
    const r = toLeadImport(
      ['', 'Lumen Foods', 'hi@lumen.example'],
      { name: 0, company: 1, email: 2 },
      'INR',
    );
    expect(r.ok && r.lead.name).toBe('Lumen Foods');
  });
});

describe('amounts as people write them', () => {
  it.each([
    ['4,86,000', 'INR', 48_600_000n],
    ['₹4.86 L', 'INR', 48_600_000n],
    ['4.865 lakh', 'INR', 48_650_000n],
    ['2 Cr', 'INR', 2_000_000_000n],
    ['50k', 'INR', 5_000_000n],
    ['$1,200.50', 'USD', 120_050n],
    ['1200', 'JPY', 1_200n],
  ])('%s %s', (text, currency, minor) => {
    expect(parseAmountText(text, currency)).toBe(minor);
  });

  it('refuses what it can’t read', () => {
    expect(() => parseAmountText('lots', 'INR')).toThrow();
    expect(() => parseAmountText('4 bananas', 'INR')).toThrow();
    expect(() => parseAmountText('1.234', 'INR')).toThrow('decimal places');
  });
});
