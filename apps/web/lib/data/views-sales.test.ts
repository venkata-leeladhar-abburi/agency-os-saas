import { standardProposal } from '@agency-os/core';
import { describe, expect, it } from 'vitest';
import {
  applyProposalText,
  dueIn,
  mentions,
  proposalStatus,
  quoteTotals,
  relativeInSentence,
  reminderMessage,
  taskDue,
  whatsappLink,
} from './views';

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

describe('dueIn and relativeInSentence', () => {
  it('reads future dates and keeps weekday capitals', () => {
    expect(dueIn('2026-10-31T06:00:00Z', now)).toBe('in 5 days');
    expect(dueIn('2026-10-27T06:00:00Z', now)).toBe('tomorrow');
    expect(dueIn('2026-10-24T06:00:00Z', now)).toBe('2 days ago');
    expect(relativeInSentence('2026-10-24T06:00:00Z', now)).toBe('Sat');
    expect(relativeInSentence('2026-10-25T06:00:00Z', now)).toBe('yesterday');
  });
});

describe('reminder sharing', () => {
  const now = new Date('2026-10-26T06:00:00Z');
  const base = {
    contactName: 'Srinivas Beere',
    number: 'OSS/26-27/014',
    amountDue: '₹29,500.00',
    payUrl: 'https://app.example/pay/abc',
    now,
  };
  it('writes the message in the right tense', () => {
    expect(reminderMessage({ ...base, dueOn: '2026-10-20' })).toBe(
      'Hi Srinivas, invoice OSS/26-27/014 for ₹29,500.00 was due on 20 Oct 2026. You can pay it or download it here: https://app.example/pay/abc',
    );
    expect(reminderMessage({ ...base, dueOn: '2026-10-26' })).toContain('is due on 26 Oct 2026');
  });
  it('opens the client’s chat when the number has its country code, else lets you pick', () => {
    expect(whatsappLink('+91 90149 52056', 'Hi there')).toBe(
      'https://wa.me/919014952056?text=Hi%20there',
    );
    expect(whatsappLink('+44 20 7946 0000', 'x')).toBe('https://wa.me/442079460000?text=x');
    expect(whatsappLink('98480 22338', 'x')).toBe('https://wa.me/?text=x');
    expect(whatsappLink(null, 'a&b')).toBe('https://wa.me/?text=a%26b');
  });
});
