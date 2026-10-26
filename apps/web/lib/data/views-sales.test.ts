import { standardProposal } from '@agency-os/core';
import { describe, expect, it } from 'vitest';
import { applyProposalText, mentions, proposalStatus, quoteTotals, taskDue } from './views';

const now = new Date('2026-10-26T04:30:00Z'); // 10:00 IST
const settings = { stateCode: '37', lutArn: 'AD3609260012345' };

describe('quoteTotals', () => {
  it('takes the discount off before GST', () => {
    const t = quoteTotals(
      {
        currency: 'INR',
        country: 'IN',
        stateCode: '29',
        discountMinor: 1_000_000n,
        lines: [{ description: 'Website', quantity: '1', rateMinor: 6_000_000n, taxRateBp: 1800 }],
      },
      settings,
    );
    // ₹60,000 − ₹10,000 = ₹50,000 taxable; IGST ₹9,000.
    expect([t.igst.amountMinor, t.total.amountMinor]).toEqual([900_000n, 5_900_000n]);
  });
});

describe('proposalStatus', () => {
  it('expires sent and viewed proposals after their date', () => {
    expect(proposalStatus({ status: 'viewed', validUntil: '2026-10-25' }, now)).toBe('expired');
    expect(proposalStatus({ status: 'sent', validUntil: '2026-10-26' }, now)).toBe('sent');
    expect(proposalStatus({ status: 'accepted', validUntil: '2026-10-01' }, now)).toBe('accepted');
  });
});

describe('taskDue', () => {
  it('marks open tasks overdue, not done ones', () => {
    expect(taskDue('2026-10-24', false, now)).toEqual({ text: '24 Oct (overdue)', overdue: true });
    expect(taskDue('2026-10-24', true, now).overdue).toBe(false);
    expect(taskDue('2026-10-27', false, now).text).toBe('Tomorrow');
    expect(taskDue(null, false, now).text).toBe('No due date');
  });
});

describe('mentions', () => {
  it('finds members by full name', () => {
    expect(mentions('@Ananya Iyer and @Arjun look', ['Ananya Iyer', 'Arjun Mehta'])).toEqual([
      'Ananya Iyer',
    ]);
  });
});

describe('applyProposalText', () => {
  it('fills the template and clears the placeholders it filled', () => {
    const blocks = standardProposal({
      clientName: 'Kite & Co',
      date: '2026-10-26',
      preparedBy: 'Kiran Rao',
    });
    const next = applyProposalText(blocks, {
      about: 'A studio in Vijayawada.',
      goals: [],
      included: ['Five pages'],
      excluded: ['Photography'],
      paymentTerms: '50% advance',
      terms: '',
    });
    const about = next.find((b) => b.type === 'text' && b.heading === 'About us');
    const goals = next.find((b) => b.type === 'list');
    const scope = next.find((b) => b.type === 'scope');
    expect(about).toMatchObject({ body: 'A studio in Vijayawada.', placeholder: false });
    expect(goals).toMatchObject({ placeholder: true });
    expect(scope).toMatchObject({ included: ['Five pages'], excluded: ['Photography'] });
  });
});
