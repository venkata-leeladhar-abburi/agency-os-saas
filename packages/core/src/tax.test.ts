import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';
import { applyPayment, calculateInvoice, taxTreatment, type InvoiceInput } from './tax';
import { amountInWords } from './words';

// Worked cases from docs/04-engineering/tax-test-cases.md. Supplier: Andhra Pradesh (37).
const AP = '37';
const items: InvoiceInput['lines'] = [
  { description: 'Website design and build', sac: '998314', quantity: 1, rateMinor: 3_500_000n, taxRateBp: 1800 },
  { description: 'CMS setup and training', sac: '998314', quantity: 1, rateMinor: 500_000n, taxRateBp: 1800 },
];

describe('A. intra-state tax invoice', () => {
  const inv = calculateInvoice({
    currency: 'INR',
    supplierStateCode: AP,
    placeOfSupply: { kind: 'india', stateCode: '37' },
    lines: items,
  });
  it('charges CGST and SGST at 9% each', () => {
    expect(inv.treatment).toBe('intra');
    expect(inv.documentType).toBe('tax_invoice');
    expect(inv.subtotal.amountMinor).toBe(4_000_000n);
    expect(inv.cgst.amountMinor).toBe(360_000n);
    expect(inv.sgst.amountMinor).toBe(360_000n);
    expect(inv.igst.amountMinor).toBe(0n);
    expect(inv.total.amountMinor).toBe(4_720_000n);
    expect(formatMoney(inv.total.amountMinor, 'INR')).toBe('₹47,200.00');
  });
  it('states the total in words', () => {
    expect(amountInWords(inv.total.amountMinor, 'INR')).toBe('Rupees Forty Seven Thousand Two Hundred Only');
  });
});

describe('B. inter-state tax invoice', () => {
  it('charges IGST at 18%', () => {
    const inv = calculateInvoice({
      currency: 'INR',
      supplierStateCode: AP,
      placeOfSupply: { kind: 'india', stateCode: '29' },
      lines: items,
    });
    expect(inv.treatment).toBe('inter');
    expect([inv.cgst.amountMinor, inv.sgst.amountMinor, inv.igst.amountMinor]).toEqual([0n, 0n, 720_000n]);
    expect(inv.total.amountMinor).toBe(4_720_000n);
  });
});

describe('C. place of supply from the billing state', () => {
  it('treats an unregistered client in Tamil Nadu as inter-state', () => {
    expect(
      taxTreatment({ supplierStateCode: AP, placeOfSupply: { kind: 'india', stateCode: '33' } }),
    ).toBe('inter');
  });
});

describe('D. export of services under LUT', () => {
  const inv = calculateInvoice({
    currency: 'USD',
    supplierStateCode: AP,
    placeOfSupply: { kind: 'export', country: 'US' },
    hasValidLut: true,
    exchangeRateToInr: '84.20',
    lines: [{ description: 'Design sprint (5 days)', quantity: 1, rateMinor: 200_000n, taxRateBp: 1800 }],
  });
  it('charges no tax and converts to INR', () => {
    expect(inv.treatment).toBe('export_lut');
    expect(inv.documentType).toBe('export_invoice');
    expect(inv.igst.amountMinor).toBe(0n);
    expect(inv.total.amountMinor).toBe(200_000n);
    expect(inv.totalInr?.amountMinor).toBe(16_840_000n);
    expect(formatMoney(inv.totalInr!.amountMinor, 'INR')).toBe('₹1,68,400.00');
    expect(inv.warnings).toEqual([]);
  });
  it('states the total in words', () => {
    expect(amountInWords(inv.total.amountMinor, 'USD')).toBe('US Dollars Two Thousand Only');
  });
});

describe('E. export without a LUT', () => {
  it('charges IGST and warns', () => {
    const inv = calculateInvoice({
      currency: 'USD',
      supplierStateCode: AP,
      placeOfSupply: { kind: 'export', country: 'US' },
      lines: [{ description: 'Design sprint (5 days)', quantity: 1, rateMinor: 200_000n, taxRateBp: 1800 }],
    });
    expect(inv.igst.amountMinor).toBe(36_000n);
    expect(inv.total.amountMinor).toBe(236_000n);
    expect(inv.warnings).toEqual(['No valid LUT for this date. IGST is charged.']);
    expect(inv.totalInr).toBeUndefined();
  });
});

describe('F. supplier not registered', () => {
  it('issues a bill of supply with no tax', () => {
    const inv = calculateInvoice({
      currency: 'INR',
      placeOfSupply: { kind: 'india', stateCode: '37' },
      lines: items,
    });
    expect(inv.treatment).toBe('none');
    expect(inv.documentType).toBe('bill_of_supply');
    expect(inv.total.amountMinor).toBe(inv.subtotal.amountMinor);
  });
  it('does not warn about a LUT when the supplier is not registered', () => {
    const inv = calculateInvoice({
      currency: 'USD',
      placeOfSupply: { kind: 'export', country: 'US' },
      lines: [{ description: 'Sprint', quantity: 1, rateMinor: 100n, taxRateBp: 1800 }],
    });
    expect(inv.warnings).toEqual([]);
  });
});

describe('G. rounding per line', () => {
  const lines: InvoiceInput['lines'] = [
    { description: 'Line 1', quantity: 3, rateMinor: 33_333n, taxRateBp: 1800 },
    { description: 'Line 2', quantity: '1.5', rateMinor: 123_457n, taxRateBp: 1800 },
  ];
  it('rounds each line and head half-up (intra-state)', () => {
    const inv = calculateInvoice({
      currency: 'INR',
      supplierStateCode: AP,
      placeOfSupply: { kind: 'india', stateCode: '37' },
      lines,
    });
    expect(inv.lines.map((l) => l.taxableMinor)).toEqual([99_999n, 185_186n]);
    expect(inv.lines.map((l) => l.cgstMinor)).toEqual([9_000n, 16_667n]);
    expect(inv.subtotal.amountMinor).toBe(285_185n);
    expect(inv.cgst.amountMinor).toBe(25_667n);
    expect(inv.sgst.amountMinor).toBe(25_667n);
    expect(inv.total.amountMinor).toBe(336_519n);
  });
  it('rounds the total to the rupee when round-off is on', () => {
    const inv = calculateInvoice({
      currency: 'INR',
      supplierStateCode: AP,
      placeOfSupply: { kind: 'india', stateCode: '37' },
      lines,
      roundOff: true,
    });
    expect(inv.roundOff.amountMinor).toBe(-19n);
    expect(inv.total.amountMinor).toBe(336_500n);
  });
  it('rounds up at fifty paise', () => {
    const inv = calculateInvoice({
      currency: 'INR',
      supplierStateCode: AP,
      placeOfSupply: { kind: 'india', stateCode: '37' },
      lines: [{ description: 'x', quantity: 1, rateMinor: 150n, taxRateBp: 0 }],
      roundOff: true,
    });
    expect(inv.roundOff.amountMinor).toBe(50n);
    expect(inv.total.amountMinor).toBe(200n);
  });
  it('gives the inter-state amounts', () => {
    const inv = calculateInvoice({
      currency: 'INR',
      supplierStateCode: AP,
      placeOfSupply: { kind: 'india', stateCode: '29' },
      lines,
    });
    expect(inv.lines.map((l) => l.igstMinor)).toEqual([18_000n, 33_333n]);
    expect(inv.igst.amountMinor).toBe(51_333n);
    expect(inv.total.amountMinor).toBe(336_518n);
  });
});

describe('H. discount before tax', () => {
  it('taxes the discounted amount', () => {
    const inv = calculateInvoice({
      currency: 'INR',
      supplierStateCode: AP,
      placeOfSupply: { kind: 'india', stateCode: '29' },
      lines: [{ description: 'Retainer', quantity: 1, rateMinor: 5_000_000n, discountMinor: 500_000n, taxRateBp: 1800 }],
    });
    expect(inv.subtotal.amountMinor).toBe(4_500_000n);
    expect(inv.igst.amountMinor).toBe(810_000n);
    expect(inv.total.amountMinor).toBe(5_310_000n);
  });
});

describe('line validation', () => {
  const base = { currency: 'INR', supplierStateCode: AP, placeOfSupply: { kind: 'india', stateCode: '37' } } as const;
  it('rejects zero quantity, negative rates and oversized discounts', () => {
    expect(() => calculateInvoice({ ...base, lines: [{ description: 'a', quantity: 0, rateMinor: 1n, taxRateBp: 0 }] })).toThrow('Quantity');
    expect(() => calculateInvoice({ ...base, lines: [{ description: 'a', quantity: 1, rateMinor: -1n, taxRateBp: 0 }] })).toThrow('Rate');
    expect(() =>
      calculateInvoice({ ...base, lines: [{ description: 'a', quantity: 1, rateMinor: 100n, discountMinor: 101n, taxRateBp: 0 }] }),
    ).toThrow('Discount');
    expect(() =>
      calculateInvoice({ ...base, lines: [{ description: 'a', quantity: 1, rateMinor: 100n, discountMinor: -1n, taxRateBp: 0 }] }),
    ).toThrow('Discount');
  });
  it('splits an odd rate between CGST and SGST without losing a basis point', () => {
    const inv = calculateInvoice({ ...base, lines: [{ description: 'a', quantity: 1, rateMinor: 10_000n, taxRateBp: 5 }] });
    expect([inv.cgst.amountMinor, inv.sgst.amountMinor]).toEqual([2n, 3n]);
  });
});

describe('I. partial payments', () => {
  const fmt = (m: bigint) => formatMoney(m, 'INR');
  it('moves from partially paid to paid and rejects overpayment', () => {
    const first = applyPayment(4_720_000n, 0n, 2_000_000n, fmt);
    expect(first).toEqual({ ok: true, status: 'partially_paid', dueMinor: 2_720_000n });
    expect(applyPayment(4_720_000n, 2_000_000n, 2_720_001n, fmt)).toEqual({
      ok: false,
      error: 'This is more than the amount due (₹27,200.00).',
    });
    expect(applyPayment(4_720_000n, 2_000_000n, 2_720_000n, fmt)).toEqual({ ok: true, status: 'paid', dueMinor: 0n });
  });
  it('rejects zero', () => {
    expect(applyPayment(100n, 0n, 0n, fmt)).toEqual({ ok: false, error: 'Enter an amount more than zero.' });
  });
});
