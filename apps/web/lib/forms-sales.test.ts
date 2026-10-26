import { describe, expect, it } from 'vitest';
import {
  checkCode,
  checkEnquiry,
  checkProposalText,
  checkQuote,
  checkSend,
  checkTask,
} from './forms';

describe('checkTask', () => {
  const t = { title: 'Hero copy', projectId: 'acme-web', assignee: 'Ananya Iyer' };
  it('fills the defaults', () => {
    const r = checkTask(t, ['acme-web'], ['Ananya Iyer']);
    expect(r.ok && r.value).toMatchObject({ priority: 'normal', status: 'todo', dueOn: null });
  });
  it('needs a title, a known project and a member', () => {
    const r = checkTask(
      { title: '', projectId: 'x', assignee: 'Nobody' },
      ['acme-web'],
      ['Ananya Iyer'],
    );
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['assignee', 'projectId', 'title']);
  });
});

describe('checkQuote', () => {
  const line = { description: 'Website', sac: '998314', quantity: '1', rate: '60,000' };
  const base = {
    for: 'lead:kite',
    country: 'IN',
    stateCode: '29',
    validUntil: '2026-11-09',
    lines: JSON.stringify([line]),
  };
  const opts = { leadIds: ['kite'], clientIds: ['acme'], today: '2026-10-26' };
  it('takes a lead, the state and a discount', () => {
    const r = checkQuote({ ...base, discount: '5,000' }, opts);
    expect(r.ok && r.value).toMatchObject({
      leadId: 'kite',
      clientId: null,
      currency: 'INR',
      stateCode: '29',
      discountMinor: 500_000n,
    });
  });
  it('prices clients abroad in their currency and drops the state', () => {
    const r = checkQuote({ ...base, for: 'client:acme', country: 'GB' }, opts);
    expect(r.ok && r.value).toMatchObject({ currency: 'GBP', stateCode: null });
  });
  it('refuses a discount above the subtotal, a past date and an unknown lead', () => {
    const r = checkQuote(
      { ...base, for: 'lead:x', validUntil: '2026-10-01', discount: '70,000' },
      opts,
    );
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['discount', 'for', 'validUntil']);
  });
});

describe('checkProposalText', () => {
  it('splits lists by line and drops bullets', () => {
    const r = checkProposalText({
      included: '- Five pages\n• Copy\n\n',
      paymentTerms: '50% advance',
    });
    expect(r.ok && r.value.included).toEqual(['Five pages', 'Copy']);
  });
  it('needs scope and payment terms', () => {
    const r = checkProposalText({ included: ' ', paymentTerms: '' });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['included', 'paymentTerms']);
  });
});

describe('signing and sending', () => {
  it('checks the email and the code', () => {
    expect(checkSend({ email: 'Sarah@Northwind.example' })).toMatchObject({
      ok: true,
      value: { email: 'sarah@northwind.example' },
    });
    expect(checkSend({ email: 'sarah@' }).ok).toBe(false);
    expect(checkCode({ code: '123 456' })).toEqual({ ok: true, value: { code: '123456' } });
    expect(checkCode({ code: '12345' }).ok).toBe(false);
  });
});

describe('checkEnquiry', () => {
  const e = {
    name: 'Priya',
    contact: '98480 22331',
    service: 'Website',
    message: 'A site for our store',
    consent: 'on',
  };
  it('accepts an enquiry with a phone number', () => {
    const r = checkEnquiry(e);
    expect(r.ok && r.value).toMatchObject({ phone: '+919848022331', email: null, budget: null });
  });
  it('needs consent, a message and a known budget range', () => {
    const r = checkEnquiry({ ...e, consent: '', message: '', budget: 'A lot' });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['budget', 'consent', 'message']);
  });
});
