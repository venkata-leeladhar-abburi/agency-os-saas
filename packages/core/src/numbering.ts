import { financialYear, type DateInput } from './dates';

export const MAX_INVOICE_NUMBER_LENGTH = 16;

/** "OSS/26-27/014": prefix, financial year, sequence padded to 3 digits. */
export function formatInvoiceNumber(prefix: string, issuedOn: DateInput, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError('Sequence starts at 1');
  return `${prefix}/${financialYear(issuedOn)}/${String(sequence).padStart(3, '0')}`;
}

/** Checks a prefix in Settings: letters, digits and dashes, and the number stays within 16 characters. */
export function validateInvoicePrefix(prefix: string): { ok: true } | { ok: false; error: string } {
  if (!/^[A-Za-z0-9-]+$/.test(prefix)) {
    return { ok: false, error: 'Use letters, numbers and dashes only.' };
  }
  const length = `${prefix}/26-27/001`.length;
  if (length > MAX_INVOICE_NUMBER_LENGTH) {
    const max = MAX_INVOICE_NUMBER_LENGTH - '/26-27/001'.length;
    return {
      ok: false,
      error: `Invoice numbers can have 16 characters. Shorten the prefix to ${max} characters or fewer.`,
    };
  }
  return { ok: true };
}
