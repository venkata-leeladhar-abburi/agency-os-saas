import { describe, expect, it } from 'vitest';
import { divRoundHalfUp, parseDecimal, toDecimalString } from './decimal';
import {
  addMoney,
  convertMoney,
  defaultLocale,
  formatMoney,
  minorDigits,
  money,
  parseMoney,
  subtractMoney,
  sumMoney,
  formatAmount,
} from './money';
import {
  amountInWords,
  numberToWordsIndian,
  numberToWordsInternational,
  rupeesInWords,
} from './words';

describe('decimal', () => {
  it('rounds half away from zero', () => {
    expect(divRoundHalfUp(5n, 2n)).toBe(3n);
    expect(divRoundHalfUp(4n, 3n)).toBe(1n);
    expect(divRoundHalfUp(-5n, 2n)).toBe(-3n);
    expect(divRoundHalfUp(5n, -2n)).toBe(-3n);
    expect(() => divRoundHalfUp(1n, 0n)).toThrow('Division by zero');
  });
  it('parses and prints decimals exactly', () => {
    expect(parseDecimal('84.20', 8)).toBe(8_420_000_000n);
    expect(parseDecimal('-1.5', 3)).toBe(-1500n);
    expect(parseDecimal(3, 2)).toBe(300n);
    expect(() => parseDecimal('1.2345', 3)).toThrow('More than 3 decimal places');
    expect(() => parseDecimal('abc', 2)).toThrow('Not a decimal number');
    expect(toDecimalString(4_720_000n, 2)).toBe('47200.00');
    expect(toDecimalString(-5n, 2)).toBe('-0.05');
    expect(toDecimalString(7n, 0)).toBe('7');
  });
});

describe('Money', () => {
  it('adds, subtracts and sums in one currency', () => {
    expect(addMoney(money(100, 'inr'), money(250n, 'INR'))).toEqual(money(350n, 'INR'));
    expect(subtractMoney(money(100, 'INR'), money(250, 'INR')).amountMinor).toBe(-150n);
    expect(sumMoney([money(1, 'USD'), money(2, 'USD')], 'USD').amountMinor).toBe(3n);
  });
  it('refuses to mix currencies or use fractional minor units', () => {
    expect(() => addMoney(money(1, 'INR'), money(1, 'USD'))).toThrow('Currency mismatch');
    expect(() => money(1.5, 'INR')).toThrow('whole number');
  });
  it('knows minor digits and default locales', () => {
    expect(minorDigits('INR')).toBe(2);
    expect(minorDigits('JPY')).toBe(0);
    expect(defaultLocale('INR')).toBe('en-IN');
    expect(defaultLocale('usd')).toBe('en-US');
    expect(defaultLocale('GBP')).toBe('en-GB');
  });
});

describe('L. formatMoney', () => {
  it('uses Indian grouping for INR', () => {
    expect(formatMoney(48_600_000n, 'INR')).toBe('₹4,86,000.00');
    expect(formatMoney(48_600_000, 'INR', { decimals: 0 })).toBe('₹4,86,000');
    expect(formatMoney(12_400_000_000n, 'INR')).toBe('₹12,40,00,000.00');
    expect(formatMoney(-123_450n, 'INR')).toBe('-₹1,234.50');
  });
  it('uses lakh and crore when compact', () => {
    expect(formatMoney(48_600_000n, 'INR', { compact: true })).toBe('₹4.86 L');
    expect(formatMoney(12_400_000_000n, 'INR', { compact: true })).toBe('₹12.4 Cr');
    expect(formatMoney(29_500_000n, 'INR', { compact: true })).toBe('₹2.95 L');
    expect(formatMoney(10_000_000n, 'INR', { compact: true })).toBe('₹1 L');
    expect(formatMoney(8_000_000n, 'INR', { compact: true })).toBe('₹80,000');
    expect(formatMoney(-48_600_000n, 'INR', { compact: true })).toBe('-₹4.86 L');
  });
  it('uses the currency locale elsewhere', () => {
    expect(formatMoney(48_600_000n, 'USD')).toBe('$486,000.00');
    expect(formatMoney(48_600_000n, 'USD', { compact: true })).toBe('$486K');
    expect(formatMoney(120_000_000n, 'USD', { compact: true })).toBe('$1.2M');
    expect(formatMoney(1234, 'JPY')).toBe('¥1,234');
  });
  it('keeps very large amounts exact', () => {
    expect(formatMoney(900_719_925_474_099_312n, 'INR')).toBe('₹9,00,71,99,25,47,40,993.12');
  });
});

describe('parse and convert', () => {
  it('parses typed amounts', () => {
    expect(parseMoney('₹80,000', 'INR')).toBe(8_000_000n);
    expect(parseMoney('1,234.5', 'INR')).toBe(123_450n);
  });
  it('converts with an exact rate, rounding half-up', () => {
    expect(convertMoney(money(200_000n, 'USD'), '84.20', 'INR')).toEqual(money(16_840_000n, 'INR'));
    expect(convertMoney(money(1n, 'USD'), '84.205', 'INR').amountMinor).toBe(84n);
  });
});

describe('L. amounts in words', () => {
  it('uses lakh and crore for rupees with paise', () => {
    expect(rupeesInWords(123_456_789n)).toBe(
      'Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Eighty Nine Paise Only',
    );
    expect(rupeesInWords(0)).toBe('Rupees Zero Only');
    expect(rupeesInWords(12_400_000_000n)).toBe('Rupees Twelve Crore Forty Lakh Only');
    expect(amountInWords(1_000_000_000_00n, 'INR')).toBe('Rupees One Hundred Crore Only');
  });
  it('uses millions for other currencies', () => {
    expect(amountInWords(120_000_050n, 'USD')).toBe(
      'US Dollars One Million Two Hundred Thousand and Fifty Cents Only',
    );
    expect(numberToWordsInternational(2_000_000_000_015n)).toBe('Two Trillion Fifteen');
    expect(amountInWords(1_100n, 'gbp')).toBe('Pounds Sterling Eleven Only');
  });
  it('covers every number under a thousand', () => {
    expect(numberToWordsIndian(19)).toBe('Nineteen');
    expect(numberToWordsIndian(40)).toBe('Forty');
    expect(numberToWordsIndian(101)).toBe('One Hundred One');
    expect(numberToWordsIndian(999)).toBe('Nine Hundred Ninety Nine');
  });
  it('refuses unknown currencies and negative amounts', () => {
    expect(() => amountInWords(1, 'XYZ')).toThrow('No words');
    expect(() => amountInWords(-1, 'INR')).toThrow('negative');
  });
});

describe('formatAmount', () => {
  it('drops zero paise only', () => {
    expect(formatAmount(11_800_000n, 'INR')).toBe('₹1,18,000');
    expect(formatAmount(11_800_050n, 'INR')).toBe('₹1,18,000.50');
    expect(formatAmount(1_200n, 'JPY')).toBe('¥1,200');
  });
});
