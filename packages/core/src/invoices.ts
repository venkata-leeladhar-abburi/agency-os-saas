import { financialYear, formatDate, type DateInput } from './dates';
import { formatInvoiceNumber, MAX_INVOICE_NUMBER_LENGTH } from './numbering';
import type { TaxTreatment } from './tax';

/** Invoice defaults and rules (defaults-and-content.md §4; data-model.md, Money). */
export type InvoiceType = 'tax_invoice' | 'bill_of_supply' | 'export_lut' | 'proforma';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';

/** Payment terms offered in the editor (days after the issue date; 0 = on receipt). */
export const PAYMENT_TERMS_DAYS = [0, 7, 15, 30] as const;
export const DEFAULT_PAYMENT_TERMS_DAYS = 7;
export const DEFAULT_INVOICE_FOOTER = 'Thank you for your business.';

/** The document type from the GST treatment; a proforma is never a tax invoice. */
export function invoiceType(treatment: TaxTreatment, proforma = false): InvoiceType {
  if (proforma) return 'proforma';
  if (treatment === 'none') return 'bill_of_supply';
  if (treatment === 'export_lut') return 'export_lut';
  return 'tax_invoice';
}

/** Proforma numbers stay out of the tax-invoice series: "OSS/PF26-27/001". */
export function formatDocumentNumber(
  prefix: string,
  type: InvoiceType,
  issuedOn: DateInput,
  sequence: number,
) {
  if (type !== 'proforma') return formatInvoiceNumber(prefix, issuedOn, sequence);
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError('Sequence starts at 1');
  const number = `${prefix}/PF${financialYear(issuedOn)}/${String(sequence).padStart(3, '0')}`;
  if (number.length > MAX_INVOICE_NUMBER_LENGTH)
    throw new RangeError(`Number longer than ${MAX_INVOICE_NUMBER_LENGTH} characters: ${number}`);
  return number;
}

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Due date from the issue date (YYYY-MM-DD) and the payment terms. */
export function dueDate(issueOn: string, termsDays: number = DEFAULT_PAYMENT_TERMS_DAYS): string {
  if (!Number.isInteger(termsDays) || termsDays < 0)
    throw new RangeError('Payment terms are whole days, zero or more');
  return addDays(issueOn, termsDays);
}

export type ReminderKind = 'before_due' | 'on_due' | 'after_due_3' | 'after_due_7';
const REMINDERS: { kind: ReminderKind; days: number }[] = [
  { kind: 'before_due', days: -3 },
  { kind: 'on_due', days: 0 },
  { kind: 'after_due_3', days: 3 },
  { kind: 'after_due_7', days: 7 },
];

/** Default reminders (3 days before, on the due date, 3 and 7 days after), none before the issue date. */
export function reminderSchedule(
  issueOn: string,
  dueOn: string,
): { kind: ReminderKind; on: string }[] {
  return REMINDERS.map((r) => ({ kind: r.kind, on: addDays(dueOn, r.days) })).filter(
    (r) => r.on > issueOn,
  );
}

/** Overdue is worked out, not stored: issued or part-paid and past the due date. */
export function isOverdue(status: InvoiceStatus, dueOn: string | null, today: string): boolean {
  return (status === 'issued' || status === 'partially_paid') && dueOn !== null && dueOn < today;
}

/** The export-under-LUT line (the CA confirms the exact wording before launch). */
export function exportLutText(arn: string, validFrom: string): string {
  return `Supply meant for export under LUT (ARN ${arn}, dated ${formatDate(validFrom)}) without payment of IGST.`;
}
