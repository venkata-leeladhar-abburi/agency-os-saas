import { describe, expect, it } from 'vitest';
import { moneySummary, winRate, type DashboardInvoice } from './dashboard';

const inr = (o: Partial<DashboardInvoice>): DashboardInvoice => ({
  currency: 'INR',
  exchangeRate: null,
  status: 'due',
  dueMinor: 0n,
  payments: [],
  ...o,
});

describe('moneySummary', () => {
  it('splits pending and overdue, and counts only this month’s payments', () => {
    const s = moneySummary(
      [
        inr({ status: 'due', dueMinor: 4_720_000n }),
        // Partly paid: ₹20,000 in, ₹27,200 still to come (tax-test-cases.md H).
        inr({
          status: 'partially_paid',
          dueMinor: 2_720_000n,
          payments: [{ amountMinor: 2_000_000n, receivedOn: '2026-10-21' }],
        }),
        inr({ status: 'overdue', dueMinor: 2_950_000n }),
        inr({
          status: 'paid',
          payments: [
            { amountMinor: 1_000_000n, receivedOn: '2026-09-30' },
            { amountMinor: 3_499_930n, receivedOn: '2026-10-01' },
          ],
        }),
        inr({ status: 'draft', dueMinor: 9_999_999n }),
      ],
      { month: '2026-10' },
    );
    expect(s.received).toEqual({ minor: 5_499_930n, count: 2 });
    expect(s.pending).toEqual({ minor: 7_440_000n, count: 2 });
    expect(s.overdue).toEqual({ minor: 2_950_000n, count: 1 });
    expect(s.unconverted).toBe(0);
  });

  it('converts at the invoice-date rate (tax-test-cases.md D)', () => {
    const s = moneySummary(
      [
        {
          currency: 'USD',
          exchangeRate: '84.20',
          status: 'partially_paid',
          dueMinor: 120_000n,
          payments: [{ amountMinor: 80_000n, receivedOn: '2026-10-24' }],
        },
        // US$2,000.00 at 84.20 = ₹1,68,400.00.
        {
          currency: 'USD',
          exchangeRate: '84.20',
          status: 'overdue',
          dueMinor: 200_000n,
          payments: [],
        },
      ],
      { month: '2026-10' },
    );
    expect(s.received.minor).toBe(6_736_000n);
    expect(s.pending.minor).toBe(10_104_000n);
    expect(s.overdue.minor).toBe(16_840_000n);
  });

  it('leaves out, and counts, invoices in another currency with no rate', () => {
    const s = moneySummary(
      [{ currency: 'EUR', exchangeRate: null, status: 'overdue', dueMinor: 50_000n, payments: [] }],
      { month: '2026-10' },
    );
    expect(s.overdue).toEqual({ minor: 0n, count: 0 });
    expect(s.unconverted).toBe(1);
  });
});

describe('winRate', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  it('counts leads decided in the last 90 days', () => {
    expect(
      winRate(
        [
          { decidedAt: '2026-10-20T10:00:00Z', won: true },
          { decidedAt: '2026-09-01T10:00:00Z', won: false },
          { decidedAt: '2026-08-01T10:00:00Z', won: true },
          // More than 90 days ago: left out.
          { decidedAt: '2026-07-01T10:00:00Z', won: false },
        ],
        { now },
      ),
    ).toEqual({ percent: 67, decided: 3 });
  });
  it('is null when nothing was decided, not 0%', () => {
    expect(winRate([{ decidedAt: '2026-01-01T00:00:00Z', won: true }], { now })).toBeNull();
    expect(winRate([], { now })).toBeNull();
  });
});
