import { describe, expect, it } from 'vitest';
import { notificationText } from './team';

describe('notification words', () => {
  it('says which invoice is overdue, for whom and how much', () => {
    expect(
      notificationText('invoice.overdue', {
        invoiceId: 'i1',
        number: 'OSS/26-27/015',
        client: 'Acme Labs',
        amountMinor: '4720000',
        currency: 'INR',
      }),
    ).toEqual({
      title: 'Invoice OSS/26-27/015 is overdue',
      detail: 'Acme Labs · ₹47,200.00 due',
      href: '/invoices/i1',
    });
    expect(notificationText('invoice.overdue', {}).title).toBe('An invoice is overdue');
  });

  it('names who wrote and about which project', () => {
    expect(
      notificationText('message.posted', { projectId: 'p1', project: 'Website', name: 'Srinivas' }),
    ).toEqual({
      title: 'New message from Srinivas about Website',
      detail: '',
      href: '/projects/p1',
    });
  });
});
