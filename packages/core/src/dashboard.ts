// The owner dashboard's money and sales figures (prd-mvp.md E1.9). Amounts are shown in the
// base currency; an invoice in another currency is converted at its invoice-date rate, and
// one without a rate is counted separately rather than guessed.
import { convertMoney, type CurrencyCode } from './money';

export type DashboardInvoice = {
  currency: CurrencyCode;
  /** Base currency per unit of the invoice currency, on the invoice date ("84.20"). */
  exchangeRate: string | null;
  status: 'draft' | 'due' | 'overdue' | 'paid' | 'partially_paid';
  dueMinor: bigint;
  payments: { amountMinor: bigint; receivedOn: string }[];
};

export type MoneyFigure = { minor: bigint; count: number };

export type MoneySummary = {
  /** Payments received in the month, in the base currency. */
  received: MoneyFigure;
  /** Still to be paid and not yet late (due or partly paid). */
  pending: MoneyFigure;
  overdue: MoneyFigure;
  /** Invoices in another currency with no exchange rate: left out of the figures. */
  unconverted: number;
};

function toBase(minor: bigint, inv: DashboardInvoice, base: CurrencyCode): bigint | null {
  if (inv.currency.toUpperCase() === base.toUpperCase()) return minor;
  if (!inv.exchangeRate) return null;
  return convertMoney({ amountMinor: minor, currency: inv.currency }, inv.exchangeRate, base)
    .amountMinor;
}

/** `month` is "YYYY-MM" in the workspace's time zone; drafts never count. */
export function moneySummary(
  invoices: DashboardInvoice[],
  { month, base = 'INR' }: { month: string; base?: CurrencyCode },
): MoneySummary {
  const out: MoneySummary = {
    received: { minor: 0n, count: 0 },
    pending: { minor: 0n, count: 0 },
    overdue: { minor: 0n, count: 0 },
    unconverted: 0,
  };
  for (const inv of invoices) {
    if (inv.status === 'draft') continue;
    if (toBase(1n, inv, base) === null) {
      out.unconverted++;
      continue;
    }
    for (const p of inv.payments) {
      if (p.receivedOn.slice(0, 7) !== month) continue;
      out.received.minor += toBase(p.amountMinor, inv, base)!;
      out.received.count++;
    }
    const bucket =
      inv.status === 'overdue'
        ? out.overdue
        : inv.status === 'due' || inv.status === 'partially_paid'
          ? out.pending
          : null;
    if (bucket && inv.dueMinor > 0n) {
      bucket.minor += toBase(inv.dueMinor, inv, base)!;
      bucket.count++;
    }
  }
  return out;
}

/**
 * Won ÷ decided (won or lost) among leads decided in the last `days` days, as a whole
 * percentage; null when none were decided, so the screen can say so instead of "0%".
 */
export function winRate(
  decisions: { decidedAt: string; won: boolean }[],
  { now = new Date(), days = 90 }: { now?: Date; days?: number } = {},
): { percent: number; decided: number } | null {
  const from = now.getTime() - days * 24 * 60 * 60 * 1000;
  const recent = decisions.filter((d) => {
    const t = new Date(d.decidedAt).getTime();
    return t >= from && t <= now.getTime();
  });
  if (!recent.length) return null;
  const won = recent.filter((d) => d.won).length;
  return { percent: Math.round((won / recent.length) * 100), decided: recent.length };
}
