import { describe, expect, it } from 'vitest';
import {
  allocateDiscount,
  calculateQuote,
  formatQuoteNumber,
  standardProposal,
  unfilledBlocks,
} from './sales-docs';

describe('quote numbers', () => {
  it('uses the prefix, Q and the financial year', () => {
    expect(formatQuoteNumber('OSS', '2026-10-26', 1)).toBe('OSS/Q26-27/001');
    expect(formatQuoteNumber('OSS', '2027-03-31', 120)).toBe('OSS/Q26-27/120');
    expect(formatQuoteNumber('OSS', '2027-04-01', 1)).toBe('OSS/Q27-28/001');
    expect(() => formatQuoteNumber('OSS', '2026-10-26', 0)).toThrow();
    expect(() => formatQuoteNumber('ONESTOP', '2026-10-26', 1)).toThrow('16 characters');
  });
});

describe('allocateDiscount', () => {
  it('splits in proportion and always adds up', () => {
    expect(allocateDiscount([100_000n, 50_000n], 15_000n)).toEqual([10_000n, 5_000n]);
    expect(allocateDiscount([100n, 100n, 100n], 100n)).toEqual([34n, 33n, 33n]);
    expect(allocateDiscount([1n, 2n], 2n)).toEqual([1n, 1n]);
    expect(allocateDiscount([500n], 0n)).toEqual([0n]);
    const parts = allocateDiscount([33_333n, 66_667n, 1n], 9_999n);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(9_999n);
  });

  it('refuses a discount larger than the subtotal or below zero', () => {
    expect(() => allocateDiscount([100n], 101n)).toThrow();
    expect(() => allocateDiscount([100n], -1n)).toThrow();
  });
});

describe('calculateQuote', () => {
  it('spreads the quote discount before tax (same state: CGST + SGST)', () => {
    const totals = calculateQuote({
      currency: 'INR',
      supplierStateCode: '36',
      placeOfSupply: { kind: 'india', stateCode: '36' },
      discountMinor: 3_000_000n,
      lines: [
        { description: 'Website design', quantity: 1, rateMinor: 20_000_000n, taxRateBp: 1800 },
        { description: 'Development', quantity: 2, rateMinor: 5_000_000n, taxRateBp: 1800 },
      ],
    });
    expect(totals.lines.map((l) => l.taxableMinor)).toEqual([18_000_000n, 9_000_000n]);
    expect(totals.subtotal.amountMinor).toBe(27_000_000n);
    expect(totals.cgst.amountMinor).toBe(2_430_000n);
    expect(totals.sgst.amountMinor).toBe(2_430_000n);
    expect(totals.total.amountMinor).toBe(31_860_000n);
  });

  it('keeps line discounts and works without a quote discount', () => {
    const totals = calculateQuote({
      currency: 'USD',
      supplierStateCode: '36',
      placeOfSupply: { kind: 'export', country: 'US' },
      hasValidLut: true,
      lines: [
        {
          description: 'Brand identity',
          quantity: 1,
          rateMinor: 300_000n,
          discountMinor: 50_000n,
          taxRateBp: 1800,
        },
      ],
    });
    expect(totals).toMatchObject({
      treatment: 'export_lut',
      total: { amountMinor: 250_000n, currency: 'USD' },
    });
  });
});

describe('standard proposal', () => {
  it('has the nine blocks, filled from the context', () => {
    const blocks = standardProposal({
      clientName: 'Example Kite & Co',
      date: '26 Oct 2026',
      preparedBy: 'Example Member',
      quoteId: 'q1',
      scope: ['Website design', 'Development'],
      phases: [{ name: 'Design', clientSignOff: true }],
    });
    expect(blocks.map((b) => b.type)).toEqual([
      'cover',
      'text',
      'list',
      'scope',
      'timeline',
      'price',
      'text',
      'text',
      'sign',
    ]);
    expect(blocks[0]).toMatchObject({ title: 'Proposal for Example Kite & Co' });
    expect(blocks[3]).toMatchObject({ included: ['Website design', 'Development'], excluded: [] });
    expect(blocks[6]).toMatchObject({
      heading: 'Payment terms',
      body: '50% advance to start, 50% before launch. Invoices are due within 7 days.',
    });
    expect(unfilledBlocks(blocks)).toEqual(['About us', 'Your goals', 'Terms']);
  });

  it('uses the workspace’s about text when there is one', () => {
    const blocks = standardProposal({
      clientName: 'X',
      date: 'd',
      preparedBy: 'p',
      about: 'We build calm software.',
    });
    expect(blocks[1]).toEqual({
      type: 'text',
      heading: 'About us',
      body: 'We build calm software.',
    });
    expect(blocks[5]).toMatchObject({ quoteId: null });
    expect(unfilledBlocks(blocks)).toEqual(['Your goals', 'Terms']);
  });
});
