import { describe, expect, it } from 'vitest';
import {
  budgetUsed,
  followUp,
  invoiceState,
  invoiceTotals,
  leadBoard,
  relativeTime,
} from './views';
import type { Lead } from './types';

// 26 Oct 2026, 10:00 IST
const now = new Date('2026-10-26T04:30:00Z');

describe('followUp', () => {
  it('says today, tomorrow or the day', () => {
    expect(followUp('2026-10-26T05:30:00Z', now)).toEqual({
      text: 'Today, 11:00 am',
      overdue: false,
    });
    expect(followUp('2026-10-27T05:30:00Z', now)?.text).toBe('Tomorrow, 11:00 am');
    expect(followUp('2026-10-29T05:30:00Z', now)?.text).toBe('Thu, 29 Oct, 11:00 am');
  });
  it('marks past days overdue', () => {
    expect(followUp('2026-10-24T05:30:00Z', now)).toEqual({
      text: 'Was due 24 Oct',
      overdue: true,
    });
    expect(followUp(null, now)).toBeNull();
  });
});

describe('relativeTime', () => {
  it('follows the content style', () => {
    expect(relativeTime('2026-10-26T02:30:00Z', now)).toBe('2 h ago');
    expect(relativeTime('2026-10-25T02:30:00Z', now)).toBe('Yesterday');
    expect(relativeTime('2026-10-10T02:30:00Z', now)).toBe('10 Oct');
  });
});

describe('invoiceTotals', () => {
  const lines = [{ description: 'Website', quantity: 1, rateMinor: 4_000_000n, taxRateBp: 1800 }];
  const settings = { stateCode: '37', lutArn: 'AD3609260012345' };
  it('charges CGST and SGST in the same state', () => {
    const t = invoiceTotals(
      { currency: 'INR', lines, exchangeRate: null },
      { country: 'IN', stateCode: '37' },
      settings,
    );
    expect([t.treatment, t.total.amountMinor]).toEqual(['intra', 4_720_000n]);
  });
  it('charges IGST across states', () => {
    const t = invoiceTotals(
      { currency: 'INR', lines, exchangeRate: null },
      { country: 'IN', stateCode: '29' },
      settings,
    );
    expect(t.igst.amountMinor).toBe(720_000n);
  });
  it('bills exports under the LUT without tax', () => {
    const t = invoiceTotals(
      { currency: 'USD', lines, exchangeRate: '84.20' },
      { country: 'GB', stateCode: null },
      settings,
    );
    expect([t.treatment, t.total.amountMinor]).toEqual(['export_lut', 4_000_000n]);
  });
  it('makes a bill of supply when the workspace has no GSTIN', () => {
    const t = invoiceTotals(
      { currency: 'INR', lines, exchangeRate: null },
      { country: 'IN', stateCode: '29' },
      { stateCode: null, lutArn: null },
    );
    expect(t.documentType).toBe('bill_of_supply');
  });
});

describe('invoiceState', () => {
  const base = { number: 'OSS/26-27/015', currency: 'INR', dueOn: '2026-11-02', payments: [] };
  const pay = (amountMinor: bigint) => ({
    id: 'p',
    amountMinor,
    receivedOn: '2026-10-25',
    method: 'upi' as const,
    reference: null,
  });
  it('drafts, due, part paid, paid and overdue', () => {
    expect(invoiceState({ ...base, number: null }, 100n, now).status).toBe('draft');
    expect(invoiceState(base, 100n, now).statusText).toBe('Due 2 Nov');
    expect(invoiceState({ ...base, payments: [pay(4_000n)] }, 10_000n, now).statusText).toBe(
      '₹60.00 due',
    );
    expect(invoiceState({ ...base, payments: [pay(100n)] }, 100n, now).status).toBe('paid');
    expect(invoiceState({ ...base, dueOn: '2026-10-21' }, 100n, now).statusText).toBe(
      '5 days overdue',
    );
  });
});

describe('leadBoard', () => {
  it('groups leads into stages with totals', () => {
    const lead = (id: string, stage: Lead['stage'], valueMinor: bigint) =>
      ({
        id,
        name: id,
        company: null,
        stage,
        valueMinor,
        source: 'referral',
        service: 'Website',
        owner: 'Kiran Rao',
        followUpAt: null,
      }) as unknown as Lead;
    const board = leadBoard(
      [lead('a', 'new', 8_000_000n), lead('b', 'new', 20_000_000n), lead('c', 'won', 100n)],
      now,
    );
    expect(board.map((c) => c.cards.length)).toEqual([2, 0, 0, 1, 0]);
    expect(board[0]!.total).toBe('₹2.8 L');
  });
});

describe('budgetUsed', () => {
  it('caps at 100', () => {
    expect(budgetUsed(62n, 100n)).toBe(62);
    expect(budgetUsed(150n, 100n)).toBe(100);
    expect(budgetUsed(1n, 0n)).toBe(0);
  });
});
