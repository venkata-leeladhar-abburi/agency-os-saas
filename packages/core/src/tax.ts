import { divRoundHalfUp, parseDecimal } from './decimal';
import { convertMoney, money, type Money } from './money';

/** Where the supply is taxed. */
export type PlaceOfSupply =
  | { kind: 'india'; stateCode: string }
  /** Client outside India: export of services. */
  | { kind: 'export'; country: string };

export type TaxTreatment =
  /** Supplier and place of supply in the same state: CGST + SGST. */
  | 'intra'
  /** Different states, or export without a LUT: IGST. */
  | 'inter'
  /** Export of services under a valid LUT: IGST at 0%. */
  | 'export_lut'
  /** Supplier is not registered for GST: bill of supply, no tax. */
  | 'none';

export type DocumentType = 'tax_invoice' | 'export_invoice' | 'bill_of_supply';

export type InvoiceLineInput = {
  description: string;
  /** SAC or HSN code. */
  sac?: string;
  /** Quantity as a decimal with up to 3 places (numeric(12,3)). */
  quantity: string | number;
  /** Price per unit in minor units of the invoice currency. */
  rateMinor: bigint;
  /** Discount on the line, in minor units, applied before tax. */
  discountMinor?: bigint;
  /** GST rate in basis points: 1800 = 18%. */
  taxRateBp: number;
};

export type InvoiceInput = {
  currency: string;
  /** The workspace's GSTIN state code, or undefined when it is not registered. */
  supplierStateCode?: string;
  placeOfSupply: PlaceOfSupply;
  /** A LUT that is valid on the invoice date. */
  hasValidLut?: boolean;
  lines: InvoiceLineInput[];
  /** Round the total to the nearest whole unit (rupee). */
  roundOff?: boolean;
  /** Exchange rate to INR as a decimal string, for invoices in another currency. */
  exchangeRateToInr?: string;
};

export type InvoiceLine = InvoiceLineInput & {
  taxableMinor: bigint;
  cgstMinor: bigint;
  sgstMinor: bigint;
  igstMinor: bigint;
};

export type InvoiceTotals = {
  treatment: TaxTreatment;
  documentType: DocumentType;
  currency: string;
  lines: InvoiceLine[];
  subtotal: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  roundOff: Money;
  total: Money;
  /** The total in INR when the invoice currency is not INR and a rate is given. */
  totalInr?: Money;
  /** Shown in the editor when an export has no valid LUT. */
  warnings: string[];
};

/** Decides how GST applies from the supplier, the place of supply and the LUT. */
export function taxTreatment(input: Pick<InvoiceInput, 'supplierStateCode' | 'placeOfSupply' | 'hasValidLut'>): TaxTreatment {
  if (!input.supplierStateCode) return 'none';
  if (input.placeOfSupply.kind === 'export') return input.hasValidLut ? 'export_lut' : 'inter';
  return input.placeOfSupply.stateCode === input.supplierStateCode ? 'intra' : 'inter';
}

function percentOf(amount: bigint, basisPoints: bigint): bigint {
  return divRoundHalfUp(amount * basisPoints, 10_000n);
}

/**
 * Calculates an invoice: tax per line per head, each rounded half-up to the minor unit,
 * then an optional round-off of the total to the nearest whole unit.
 */
export function calculateInvoice(input: InvoiceInput): InvoiceTotals {
  const currency = input.currency.toUpperCase();
  const treatment = taxTreatment(input);
  const warnings: string[] = [];
  if (input.placeOfSupply.kind === 'export' && input.supplierStateCode && !input.hasValidLut) {
    warnings.push('No valid LUT for this date. IGST is charged.');
  }

  const lines: InvoiceLine[] = input.lines.map((line) => {
    const quantityMilli = parseDecimal(line.quantity, 3);
    if (quantityMilli <= 0n) throw new RangeError(`Quantity must be more than zero: ${line.description}`);
    if (line.rateMinor < 0n) throw new RangeError(`Rate must not be negative: ${line.description}`);
    const gross = divRoundHalfUp(quantityMilli * line.rateMinor, 1000n);
    const discount = line.discountMinor ?? 0n;
    if (discount < 0n || discount > gross) {
      throw new RangeError(`Discount must be between zero and the line amount: ${line.description}`);
    }
    const taxableMinor = gross - discount;
    const rate = BigInt(line.taxRateBp);
    const half = rate / 2n;
    return {
      ...line,
      taxableMinor,
      cgstMinor: treatment === 'intra' ? percentOf(taxableMinor, half) : 0n,
      sgstMinor: treatment === 'intra' ? percentOf(taxableMinor, rate - half) : 0n,
      igstMinor: treatment === 'inter' ? percentOf(taxableMinor, rate) : 0n,
    };
  });

  const sum = (pick: (l: InvoiceLine) => bigint) => lines.reduce((t, l) => t + pick(l), 0n);
  const subtotal = sum((l) => l.taxableMinor);
  const cgst = sum((l) => l.cgstMinor);
  const sgst = sum((l) => l.sgstMinor);
  const igst = sum((l) => l.igstMinor);
  const beforeRoundOff = subtotal + cgst + sgst + igst;

  let roundOff = 0n;
  if (input.roundOff) {
    const unit = 100n;
    roundOff = divRoundHalfUp(beforeRoundOff, unit) * unit - beforeRoundOff;
  }
  const total = money(beforeRoundOff + roundOff, currency);

  return {
    treatment,
    documentType:
      treatment === 'none'
        ? 'bill_of_supply'
        : input.placeOfSupply.kind === 'export'
          ? 'export_invoice'
          : 'tax_invoice',
    currency,
    lines,
    subtotal: money(subtotal, currency),
    cgst: money(cgst, currency),
    sgst: money(sgst, currency),
    igst: money(igst, currency),
    roundOff: money(roundOff, currency),
    total,
    totalInr:
      currency !== 'INR' && input.exchangeRateToInr
        ? convertMoney(total, input.exchangeRateToInr, 'INR')
        : undefined,
    warnings,
  };
}

export type PaymentResult =
  | { ok: true; status: 'paid' | 'partially_paid'; dueMinor: bigint }
  | { ok: false; error: string };

/** Applies a payment to an invoice; rejects amounts above what is due. */
export function applyPayment(
  totalMinor: bigint,
  paidSoFarMinor: bigint,
  paymentMinor: bigint,
  format: (minor: bigint) => string,
): PaymentResult {
  const due = totalMinor - paidSoFarMinor;
  if (paymentMinor <= 0n) return { ok: false, error: 'Enter an amount more than zero.' };
  if (paymentMinor > due) {
    return { ok: false, error: `This is more than the amount due (${format(due)}).` };
  }
  const left = due - paymentMinor;
  return { ok: true, status: left === 0n ? 'paid' : 'partially_paid', dueMinor: left };
}
