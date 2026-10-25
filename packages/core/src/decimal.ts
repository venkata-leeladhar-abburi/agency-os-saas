/** Exact decimal helpers on bigint. Money never touches floating point. */

/** Rounds n / d half away from zero (half-up for positive amounts). */
export function divRoundHalfUp(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('Division by zero');
  const negative = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (2n * an + ad) / (2n * ad);
  return negative ? -q : q;
}

/**
 * Parses a decimal string ("1.5", "84.20", "-3") into a bigint scaled by 10^scale.
 * Throws if it has more fraction digits than the scale allows.
 */
export function parseDecimal(value: string | number, scale: number): bigint {
  const text = typeof value === 'number' ? String(value) : value.trim();
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new RangeError(`Not a decimal number: ${text}`);
  const [, sign, whole = '0', fraction = ''] = match;
  if (fraction.length > scale) throw new RangeError(`More than ${scale} decimal places: ${text}`);
  const scaled = BigInt(whole + fraction.padEnd(scale, '0'));
  return sign ? -scaled : scaled;
}

/** Writes a bigint scaled by 10^scale as a plain decimal string ("123456.78"). */
export function toDecimalString(value: bigint, scale: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const fraction = scale > 0 ? `.${digits.slice(digits.length - scale)}` : '';
  return `${negative ? '-' : ''}${whole}${fraction}`;
}
