export type Money = { amountMinor: bigint; currency: string };

export function money(amountMinor: bigint, currency: string): Money {
  return { amountMinor, currency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}
