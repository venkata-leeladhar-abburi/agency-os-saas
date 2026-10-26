import { divRoundHalfUp, parseDecimal, toDecimalString } from './decimal';

export type CurrencyCode = string;

/** An amount in minor units (paise, cents) with its ISO 4217 currency. */
export type Money = { amountMinor: bigint; currency: CurrencyCode };

export function money(amountMinor: bigint | number, currency: CurrencyCode): Money {
  if (typeof amountMinor === 'number' && !Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Money needs a whole number of minor units');
  }
  return { amountMinor: BigInt(amountMinor), currency: currency.toUpperCase() };
}

function sameCurrency(a: Money, b: Money) {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
}

export function addMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function sumMoney(items: Money[], currency: CurrencyCode): Money {
  return items.reduce((total, m) => addMoney(total, m), money(0, currency));
}

/** Number of minor-unit digits for a currency: 2 for INR and USD, 0 for JPY. */
export function minorDigits(currency: CurrencyCode): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits as number;
}

/** The default display locale for a currency: Indian grouping for INR. */
export function defaultLocale(currency: CurrencyCode): string {
  const map: Record<string, string> = { INR: 'en-IN', GBP: 'en-GB', EUR: 'en-IE', AED: 'en-AE' };
  return map[currency.toUpperCase()] ?? 'en-US';
}

export type FormatMoneyOptions = {
  /** ₹4.86 L, ₹1.2 Cr, $486K. */
  compact?: boolean;
  locale?: string;
  /** Fraction digits; defaults to the currency's minor digits (2). */
  decimals?: number;
};

function trimCompact(value: bigint, divisor: bigint): string {
  // Two decimals, half-up, then drop trailing zeros: 4.86, 12.4, 3.
  const hundredths = divRoundHalfUp(value * 100n, divisor);
  return toDecimalString(hundredths, 2).replace(/\.?0+$/, '');
}

/**
 * Formats minor units for display. INR uses Indian grouping (₹4,86,000.00) and
 * lakh/crore when compact; other currencies use their locale.
 */
export function formatMoney(
  minor: bigint | number,
  currency: CurrencyCode,
  { compact = false, locale, decimals }: FormatMoneyOptions = {},
): string {
  const code = currency.toUpperCase();
  const amount = BigInt(minor);
  const digits = minorDigits(code);
  const loc = locale ?? defaultLocale(code);

  if (compact && code === 'INR') {
    const negative = amount < 0n;
    const rupees = (negative ? -amount : amount) / 10n ** BigInt(digits);
    const sign = negative ? '-' : '';
    if (rupees >= 1_00_00_000n) return `${sign}₹${trimCompact(rupees, 1_00_00_000n)} Cr`;
    if (rupees >= 1_00_000n) return `${sign}₹${trimCompact(rupees, 1_00_000n)} L`;
    return formatMoney(minor, code, { locale: loc, decimals: 0 });
  }

  const formatter = new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: code,
    ...(compact
      ? { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }
      : { minimumFractionDigits: decimals ?? digits, maximumFractionDigits: decimals ?? digits }),
  });
  // A decimal string keeps every digit exact (Intl.NumberFormat v3).
  return formatter.format(toDecimalString(amount, digits) as unknown as number);
}

/** Parses a typed amount ("80,000", "₹1,234.50") into minor units. */
export function parseMoney(input: string, currency: CurrencyCode): bigint {
  const cleaned = input.replace(/[^\d.-]/g, '');
  return parseDecimal(cleaned, minorDigits(currency));
}

/** Converts an amount with an exchange rate given as a decimal string (numeric(18,8)). */
export function convertMoney(from: Money, rate: string, to: CurrencyCode): Money {
  const scaledRate = parseDecimal(rate, 8);
  const fromDigits = minorDigits(from.currency);
  const toDigits = minorDigits(to);
  const numerator = from.amountMinor * scaledRate * 10n ** BigInt(toDigits);
  const denominator = 10n ** 8n * 10n ** BigInt(fromDigits);
  return money(divRoundHalfUp(numerator, denominator), to);
}

/** For messages and notifications: whole amounts without the zero paise (₹1,18,000), others in full. */
export function formatAmount(minor: bigint, currency: CurrencyCode, locale?: string): string {
  const whole = minor % 10n ** BigInt(minorDigits(currency)) === 0n;
  return formatMoney(minor, currency, { locale, ...(whole ? { decimals: 0 } : {}) });
}
