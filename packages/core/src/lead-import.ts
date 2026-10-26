import { parseDecimal } from './decimal';
import { toLeadSource, type LeadSource } from './leads';
import { minorDigits, type CurrencyCode } from './money';

/** CSV import for leads: guess the column mapping, then check each row (E1.1). */
export const LEAD_IMPORT_FIELDS = [
  'name',
  'company',
  'email',
  'phone',
  'source',
  'value',
  'service',
  'stage',
  'notes',
] as const;
export type LeadImportField = (typeof LEAD_IMPORT_FIELDS)[number];
export type LeadImportMapping = Partial<Record<LeadImportField, number>>;

const HEADER_HINTS: Record<LeadImportField, RegExp> = {
  name: /^(full\s*)?name$|^(contact|lead|client|customer)(\s*name)?$/,
  company: /company|business|organi[sz]ation|^org$|firm|brand/,
  email: /e-?mail|^mail$/,
  phone: /phone|mobile|whats\s*app|contact\s*no|cell/,
  source: /source|channel|(came|where)\s*from/,
  value: /value|budget|amount|deal|price/,
  service: /service|requirement|interest/,
  stage: /stage|status/,
  notes: /notes?|message|comments?|remarks?|description/,
};

/** Maps each field to the first header that looks like it (case and spacing ignored). */
export function guessLeadMapping(headers: readonly string[]): LeadImportMapping {
  const mapping: LeadImportMapping = {};
  const used = new Set<number>();
  for (const field of LEAD_IMPORT_FIELDS) {
    const index = headers.findIndex(
      (h, i) => !used.has(i) && HEADER_HINTS[field].test(h.trim().toLowerCase()),
    );
    if (index >= 0) {
      mapping[field] = index;
      used.add(index);
    }
  }
  return mapping;
}

export type LeadImportRow = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  valueMinor: bigint | null;
  service: string | null;
  stage: string | null;
  notes: string | null;
};

export type LeadImportResult = { ok: true; lead: LeadImportRow } | { ok: false; errors: string[] };

/** Digits only, keeping a leading +: "+91 98765-43210" → "+919876543210". */
export function normalizePhone(text: string): string {
  return text.trim().replace(/(?!^\+)[^\d]/g, '');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUFFIX: Record<string, bigint> = {
  k: 1_000n,
  thousand: 1_000n,
  l: 100_000n,
  lakh: 100_000n,
  lakhs: 100_000n,
  lac: 100_000n,
  cr: 10_000_000n,
  crore: 10_000_000n,
  crores: 10_000_000n,
};

/** Reads amounts as people write them: "4,86,000", "₹4.86 L", "2 Cr", "$1,200.50", "50k". */
export function parseAmountText(text: string, currency: CurrencyCode): bigint {
  const match = /^([\d.,\s]+?)\s*([a-z]+)?$/i.exec(text.replace(/[^\d.,a-z\s]/gi, '').trim());
  const multiplier = match?.[2] ? SUFFIX[match[2].toLowerCase()] : 1n;
  if (!match || !multiplier) throw new RangeError(`Not an amount: ${text}`);
  const digits = minorDigits(currency);
  const extra = 7; // room for the decimals of "4.865 L"
  const scaled = parseDecimal(match[1]!.replace(/[,\s]/g, ''), digits + extra) * multiplier;
  const unit = 10n ** BigInt(extra);
  if (scaled % unit !== 0n)
    throw new RangeError(`More decimal places than the currency has: ${text}`);
  return scaled / unit;
}

/** Checks one CSV row; errors say what to fix in the file. */
export function toLeadImport(
  cells: readonly string[],
  mapping: LeadImportMapping,
  currency: CurrencyCode,
): LeadImportResult {
  const get = (field: LeadImportField) => {
    const index = mapping[field];
    const value = index === undefined ? '' : (cells[index] ?? '').trim();
    return value === '' ? null : value;
  };
  const errors: string[] = [];
  const company = get('company');
  const name = get('name') ?? company;
  if (!name) errors.push('Add a name or a company.');
  const email = get('email')?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) errors.push(`Check the email "${email}".`);
  const rawPhone = get('phone');
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && (phone!.replace('+', '').length < 7 || phone!.replace('+', '').length > 15))
    errors.push(`Check the phone number "${rawPhone}".`);
  if (!email && !rawPhone) errors.push('Add an email or a phone number.');
  let valueMinor: bigint | null = null;
  const value = get('value');
  if (value) {
    try {
      valueMinor = parseAmountText(value, currency);
      if (valueMinor < 0n) throw new RangeError('negative');
    } catch {
      errors.push(`Write the value as a number, like 4,86,000 or 4.86 L (was "${value}").`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    lead: {
      name: name!,
      company,
      email,
      phone,
      source: toLeadSource(get('source')),
      valueMinor,
      service: get('service'),
      stage: get('stage'),
      notes: get('notes'),
    },
  };
}
