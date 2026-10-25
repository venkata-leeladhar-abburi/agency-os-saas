export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Not a date: ${String(value)}`);
  return date;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type FormatDateOptions = {
  locale?: string;
  /** Include the year (default true). */
  year?: boolean;
  /** Time zone for timestamps; date-only strings ("2026-10-25") are never shifted. */
  timeZone?: string;
};

/**
 * Dates with a written month: "25 Oct 2026" (en-IN, en-GB), "Oct 25, 2026" (en-US).
 * Never numeric-only.
 */
export function formatDate(
  value: DateInput,
  { locale = 'en-IN', year = true, timeZone = 'Asia/Kolkata' }: FormatDateOptions = {},
): string {
  const dateOnly = typeof value === 'string' && DATE_ONLY.test(value);
  const text = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(year ? { year: 'numeric' } : {}),
    timeZone: dateOnly ? 'UTC' : timeZone,
  }).format(toDate(value));
  // Some locales write "Sept"; the product uses three-letter months everywhere.
  return text.replace('Sept', 'Sep');
}

/**
 * The Indian financial year (April to March) as "26-27" for any date in it.
 */
export function financialYear(value: DateInput, timeZone = 'Asia/Kolkata'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'numeric',
    timeZone: typeof value === 'string' && DATE_ONLY.test(value) ? 'UTC' : timeZone,
  }).formatToParts(toDate(value));
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const start = month >= 4 ? year : year - 1;
  const two = (n: number) => String(n % 100).padStart(2, '0');
  return `${two(start)}-${two(start + 1)}`;
}
