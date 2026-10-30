import { describe, expect, it } from 'vitest';
import {
  channelsFor,
  isNotificationKey,
  NOTIFICATION_KEYS,
  NOTIFICATION_KINDS,
  notificationSubject,
} from './notifications';

describe('notification defaults', () => {
  it('lists every event from the defaults table, and the proposed question kind', () => {
    expect(NOTIFICATION_KEYS).toHaveLength(15);
    expect(channelsFor('proposal.question')).toEqual({ inApp: true, email: 'on' });
    expect(isNotificationKey('payment.received')).toBe(true);
    expect(isNotificationKey('toString')).toBe(false);
  });

  it('uses the default channels without a preference', () => {
    expect(channelsFor('lead.enquiry')).toEqual({ inApp: true, email: 'on' });
    expect(channelsFor('lead.follow_up_due')).toEqual({ inApp: true, email: 'digest' });
    expect(channelsFor('proposal.viewed')).toEqual({ inApp: true, email: 'off' });
    expect(channelsFor('invoice.reminder')).toEqual({ inApp: false, email: 'on' });
    expect(channelsFor('gate.requested')).toEqual({ inApp: false, email: 'on' });
    expect(channelsFor('message.posted')).toEqual({ inApp: true, email: 'on' });
  });

  it('applies a member’s preference', () => {
    expect(channelsFor('proposal.viewed', { email: 'on' })).toEqual({ inApp: true, email: 'on' });
    expect(channelsFor('payment.received', { inApp: false, email: 'off' })).toEqual({
      inApp: false,
      email: 'off',
    });
    // A kind with no email and no team in-app list can't be switched on.
    expect(channelsFor('task.assigned', { email: 'on' })).toEqual({ inApp: true, email: 'off' });
    expect(channelsFor('member.invited', { inApp: true })).toEqual({ inApp: false, email: 'on' });
  });

  it('fills subjects', () => {
    expect(
      notificationSubject('invoice.sent', {
        number: 'OSS/26-27/014',
        workspace: 'One Stop Solutions',
      }),
    ).toBe('Invoice OSS/26-27/014 from One Stop Solutions');
    expect(notificationSubject('payment.received', { amount: '₹1,18,000' })).toBe(
      'Payment received: ₹1,18,000 for [number]',
    );
    expect(notificationSubject('task.assigned', {})).toBeNull();
    expect(NOTIFICATION_KINDS['digest.daily'].subject).toBe('Today at [workspace]');
  });
});
