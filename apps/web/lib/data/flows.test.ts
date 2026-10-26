import { describe, expect, it, beforeEach } from 'vitest';
import { allowEnquiry } from './enquiry';
import { resetExampleStore } from './example-store';
import { importLeads } from './lead-import';
import { acceptProposal, declineProposal, startSigning } from './sales';

beforeEach(() => {
  resetExampleStore();
});

describe('signing a proposal', () => {
  const token = 'example-northwind-7Hq2xP9';
  it('needs the code, allows 5 tries, then makes the lead a client', async () => {
    const started = await startSigning(token);
    expect(started.ok && started.code).toMatch(/^\d{6}$/);
    const wrong = started.code === '000000' ? '111111' : '000000';
    expect(await acceptProposal(token, { name: ' ', code: started.code!, ip: '' })).toMatchObject({
      ok: false,
      field: 'name',
    });
    const miss = await acceptProposal(token, { name: 'Sarah Lewis', code: wrong, ip: '1.2.3.4' });
    expect(miss).toEqual({
      ok: false,
      field: 'code',
      error: 'That code doesn’t match. You have 4 tries left.',
    });
    const ok = await acceptProposal(token, {
      name: 'Sarah Lewis',
      code: started.code!,
      ip: '1.2.3.4',
    });
    expect(ok).toEqual({ ok: true });
    // Signed proposals can't be signed again.
    expect(await acceptProposal(token, { name: 'x', code: started.code!, ip: '' })).toMatchObject({
      ok: false,
    });
  });
  it('locks after 5 wrong codes', async () => {
    const started = await startSigning(token);
    const wrong = started.code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++)
      await acceptProposal(token, { name: 'Sarah Lewis', code: wrong, ip: '' });
    expect(
      await acceptProposal(token, { name: 'Sarah Lewis', code: started.code!, ip: '' }),
    ).toMatchObject({
      ok: false,
      error: 'Too many wrong codes. Ask for a new one.',
    });
  });
  it('can be declined once', async () => {
    expect(await declineProposal(token, 'Over budget')).toEqual({ ok: true });
    expect((await startSigning(token)).ok).toBe(false);
  });
});

describe('importLeads', () => {
  const mapping = { name: 0, company: 1, email: 2, phone: 3, value: 4 };
  it('imports good rows and skips bad ones and duplicates', async () => {
    const result = await importLeads(
      [
        ['Priya Shah', 'Example Stores', 'priya@example.in', '+91 98480 22331', '40,000'],
        ['', '', '', '', ''],
        ['Rohan', '', '', '', ''],
        ['Priya again', '', 'PRIYA@example.in', '', ''],
        ['Sarah', 'Northwind', 'sarah@northwind.example', '', ''],
        ['Meghna', 'Studio M', '', '90000 55443', 'eighty thousand'],
      ],
      mapping,
    );
    expect(result.imported).toBe(1);
    expect(result.skipped.map((s) => [s.row, s.reasons[0]])).toEqual([
      [4, 'Add an email or a phone number.'],
      [5, 'Already a lead (same email).'],
      [6, 'Already a lead (same email).'],
      [7, 'Write the value as a number, like 4,86,000 or 4.86 L (was "eighty thousand").'],
    ]);
  });
});

describe('allowEnquiry', () => {
  it('lets five through a minute per network', () => {
    const t = 1_000_000;
    const results = Array.from({ length: 6 }, (_, i) => allowEnquiry('10.0.0.1', t + i));
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(allowEnquiry('10.0.0.2', t)).toBe(true);
    expect(allowEnquiry('10.0.0.1', t + 61_000)).toBe(true);
  });
});
