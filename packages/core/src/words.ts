const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function underHundred(n: number): string {
  if (n < 20) return ONES[n] as string;
  const tens = TENS[Math.floor(n / 10)] as string;
  return n % 10 ? `${tens} ${ONES[n % 10]}` : tens;
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(underHundred(rest));
  return parts.join(' ');
}

function scaleWords(n: bigint, scales: [bigint, string][]): string {
  if (n === 0n) return 'Zero';
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of scales) {
    if (rest >= size) {
      const count = rest / size;
      rest %= size;
      parts.push(`${scaleWords(count, scales)} ${name}`);
    }
  }
  if (rest > 0n) parts.push(underThousand(Number(rest)));
  return parts.join(' ');
}

const INDIAN: [bigint, string][] = [
  [1_00_00_000n, 'Crore'],
  [1_00_000n, 'Lakh'],
  [1_000n, 'Thousand'],
];
const INTERNATIONAL: [bigint, string][] = [
  [1_000_000_000_000n, 'Trillion'],
  [1_000_000_000n, 'Billion'],
  [1_000_000n, 'Million'],
  [1_000n, 'Thousand'],
];

/** Whole numbers in words, Indian system: "Twelve Lakh Thirty Four Thousand". */
export function numberToWordsIndian(n: bigint | number): string {
  return scaleWords(BigInt(n), INDIAN);
}

/** Whole numbers in words, international system: "One Million Two Hundred Thousand". */
export function numberToWordsInternational(n: bigint | number): string {
  return scaleWords(BigInt(n), INTERNATIONAL);
}

const CURRENCY_NAMES: Record<string, { major: string; minor: string; digits: number }> = {
  INR: { major: 'Rupees', minor: 'Paise', digits: 2 },
  USD: { major: 'US Dollars', minor: 'Cents', digits: 2 },
  GBP: { major: 'Pounds Sterling', minor: 'Pence', digits: 2 },
  EUR: { major: 'Euros', minor: 'Cents', digits: 2 },
  AED: { major: 'UAE Dirhams', minor: 'Fils', digits: 2 },
  SGD: { major: 'Singapore Dollars', minor: 'Cents', digits: 2 },
  AUD: { major: 'Australian Dollars', minor: 'Cents', digits: 2 },
  CAD: { major: 'Canadian Dollars', minor: 'Cents', digits: 2 },
};

/**
 * The total in words for invoices. INR uses lakh and crore:
 * "Rupees Forty Seven Thousand Two Hundred Only".
 */
export function amountInWords(minor: bigint | number, currency: string): string {
  const code = currency.toUpperCase();
  const names = CURRENCY_NAMES[code];
  if (!names) throw new RangeError(`No words for currency ${code}`);
  const amount = BigInt(minor);
  if (amount < 0n) throw new RangeError('Amounts in words must not be negative');
  const unit = 10n ** BigInt(names.digits);
  const major = amount / unit;
  const fraction = amount % unit;
  const toWords = code === 'INR' ? numberToWordsIndian : numberToWordsInternational;
  const fractionPart = fraction > 0n ? ` and ${toWords(fraction)} ${names.minor}` : '';
  return `${names.major} ${toWords(major)}${fractionPart} Only`;
}

/** Shorthand for INR invoices. */
export function rupeesInWords(minor: bigint | number): string {
  return amountInWords(minor, 'INR');
}
