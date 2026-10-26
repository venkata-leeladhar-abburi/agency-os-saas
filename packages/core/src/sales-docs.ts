import { financialYear, type DateInput } from './dates';
import { MAX_INVOICE_NUMBER_LENGTH } from './numbering';
import {
  calculateInvoice,
  type InvoiceInput,
  type InvoiceLineInput,
  type InvoiceTotals,
} from './tax';
import { parseDecimal, divRoundHalfUp } from './decimal';

/** Quotes and proposals (E1.2; defaults-and-content.md §3 and §4). */
export const PROPOSAL_VALIDITY_DAYS = 14;
export const DEFAULT_TAX_RATE_BP = 1800;
export const DEFAULT_PAYMENT_TERMS =
  '50% advance to start, 50% before launch. Invoices are due within 7 days.';

/** Common SAC codes (the CA verifies them before launch). */
export const COMMON_SAC_CODES = [
  { code: '998314', label: 'IT design and development' },
  { code: '998313', label: 'IT consulting and support' },
  { code: '998315', label: 'Hosting and IT infrastructure' },
  { code: '998361', label: 'Advertising services' },
  { code: '998391', label: 'Specialty design services' },
] as const;

/** "OSS/Q26-27/001": the invoice format with Q before the year, within 16 characters. */
export function formatQuoteNumber(prefix: string, issuedOn: DateInput, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError('Sequence starts at 1');
  const number = `${prefix}/Q${financialYear(issuedOn)}/${String(sequence).padStart(3, '0')}`;
  if (number.length > MAX_INVOICE_NUMBER_LENGTH)
    throw new RangeError(
      `Quote number longer than ${MAX_INVOICE_NUMBER_LENGTH} characters: ${number}`,
    );
  return number;
}

/**
 * Splits a discount on the whole document across lines in proportion to their amounts, so tax
 * is charged on what the client pays. Largest remainders get the leftover paise, so the parts
 * always add up to the discount exactly.
 */
export function allocateDiscount(amounts: readonly bigint[], discount: bigint): bigint[] {
  const total = amounts.reduce((a, b) => a + b, 0n);
  if (discount < 0n || discount > total)
    throw new RangeError('The discount must be between zero and the subtotal');
  if (discount === 0n) return amounts.map(() => 0n);
  const parts = amounts.map((a, i) => ({
    i,
    share: (a * discount) / total,
    rest: (a * discount) % total,
  }));
  let left = discount - parts.reduce((s, p) => s + p.share, 0n);
  for (const p of [...parts].sort((x, y) =>
    y.rest > x.rest ? 1 : y.rest < x.rest ? -1 : x.i - y.i,
  )) {
    if (left === 0n) break;
    p.share += 1n;
    left -= 1n;
  }
  return parts.map((p) => p.share);
}

export type QuoteInput = Omit<InvoiceInput, 'lines'> & {
  lines: InvoiceLineInput[];
  /** A discount on the whole quote, in minor units, spread over the lines before tax. */
  discountMinor?: bigint;
};

/** Quote totals: the whole-quote discount spread over the lines, then the same GST rules as invoices. */
export function calculateQuote(input: QuoteInput): InvoiceTotals {
  const gross = input.lines.map(
    (l) =>
      divRoundHalfUp(parseDecimal(l.quantity, 3) * l.rateMinor, 1000n) - (l.discountMinor ?? 0n),
  );
  const shares = allocateDiscount(gross, input.discountMinor ?? 0n);
  return calculateInvoice({
    ...input,
    lines: input.lines.map((l, i) => ({
      ...l,
      discountMinor: (l.discountMinor ?? 0n) + shares[i]!,
    })),
  });
}

// ---- Proposal blocks ----

export type ProposalBlock =
  | { type: 'cover'; title: string; date: string; preparedBy: string }
  | { type: 'text'; heading: string; body: string; placeholder?: boolean }
  | { type: 'list'; heading: string; items: string[]; placeholder?: boolean }
  | { type: 'scope'; heading: string; included: string[]; excluded: string[] }
  | { type: 'timeline'; heading: string; phases: { name: string; clientSignOff: boolean }[] }
  | { type: 'price'; heading: string; quoteId: string | null }
  | { type: 'sign'; heading: string };

export type ProposalContext = {
  clientName: string;
  date: string;
  preparedBy: string;
  about?: string | null;
  quoteId?: string | null;
  scope?: string[];
  phases?: { name: string; clientSignOff: boolean }[];
};

/** The "Standard proposal" template, filled from the lead, quote and workspace. */
export function standardProposal(ctx: ProposalContext): ProposalBlock[] {
  return [
    {
      type: 'cover',
      title: `Proposal for ${ctx.clientName}`,
      date: ctx.date,
      preparedBy: ctx.preparedBy,
    },
    ctx.about
      ? { type: 'text', heading: 'About us', body: ctx.about }
      : {
          type: 'text',
          heading: 'About us',
          body: 'Write two or three sentences about your studio and the work you’re proudest of.',
          placeholder: true,
        },
    {
      type: 'list',
      heading: 'Your goals',
      items: ['What you want to achieve', 'Who it is for', 'How we’ll know it worked'],
      placeholder: true,
    },
    { type: 'scope', heading: 'Scope', included: ctx.scope ?? [], excluded: [] },
    { type: 'timeline', heading: 'Phases and timeline', phases: ctx.phases ?? [] },
    { type: 'price', heading: 'Price', quoteId: ctx.quoteId ?? null },
    { type: 'text', heading: 'Payment terms', body: DEFAULT_PAYMENT_TERMS },
    {
      type: 'text',
      heading: 'Terms',
      body: 'Add your terms here (ownership, revisions, timelines, cancellation). Agency OS does not provide legal advice.',
      placeholder: true,
    },
    { type: 'sign', heading: 'Accept and sign' },
  ];
}

/** Blocks still showing template placeholders, so the editor can ask for them before sending. */
export function unfilledBlocks(blocks: readonly ProposalBlock[]): string[] {
  return blocks.flatMap((b) =>
    (b.type === 'text' || b.type === 'list') && b.placeholder ? [b.heading] : [],
  );
}
