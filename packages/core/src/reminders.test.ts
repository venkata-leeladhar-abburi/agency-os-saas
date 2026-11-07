import { describe, expect, it } from 'vitest';
import { reminderSchedule, reminderStates, remindersToSend } from './reminders';

const invoice = { issuedOn: '2026-10-20', dueOn: '2026-11-02' };

describe('reminderSchedule', () => {
  it('3 days before, on the day, 3 and 7 days after', () => {
    expect(reminderSchedule(invoice).map((r) => [r.kind, r.on])).toEqual([
      ['before_due', '2026-10-30'],
      ['on_due', '2026-11-02'],
      ['after_due', '2026-11-05'],
      ['after_due', '2026-11-09'],
    ]);
  });
  it('crosses month and year ends', () => {
    expect(reminderSchedule({ issuedOn: '2026-12-01', dueOn: '2026-12-29' }).at(-1)!.on).toBe(
      '2027-01-05',
    );
    expect(reminderSchedule({ issuedOn: '2028-02-01', dueOn: '2028-03-01' })[0]!.on).toBe(
      '2028-02-27',
    );
  });
  it('drops reminders that would come before the invoice was issued', () => {
    // Due on receipt: issued and due the same day.
    expect(
      reminderSchedule({ issuedOn: '2026-10-26', dueOn: '2026-10-26' }).map((r) => r.label),
    ).toEqual(['3 days after', '7 days after']);
    expect(reminderSchedule({ issuedOn: '2026-10-25', dueOn: '2026-10-27' })[0]!.kind).toBe(
      'on_due',
    );
  });
});

describe('reminderStates', () => {
  const schedule = reminderSchedule(invoice);
  const states = (today: string, opts: { paid?: boolean; enabled?: boolean } = {}, sent = []) =>
    reminderStates(schedule, sent, { today, paid: false, enabled: true, ...opts }).map(
      (r) => r.state,
    );

  it('moves from scheduled to due on the date', () => {
    expect(states('2026-10-29')).toEqual(['scheduled', 'scheduled', 'scheduled', 'scheduled']);
    expect(states('2026-10-30')).toEqual(['due', 'scheduled', 'scheduled', 'scheduled']);
    expect(states('2026-11-06')).toEqual(['due', 'due', 'due', 'scheduled']);
  });
  it('keeps what was sent and cancels the rest when paid or switched off', () => {
    const sent = [{ on: '2026-10-30', sentAt: '2026-10-30T04:00:00Z' }];
    const paid = reminderStates(schedule, sent, { today: '2026-11-03', paid: true, enabled: true });
    expect(paid.map((r) => r.state)).toEqual(['sent', 'cancelled', 'cancelled', 'cancelled']);
    expect(paid[0]!.sentAt).toBe('2026-10-30T04:00:00Z');
    expect(states('2026-11-03', { enabled: false })).toEqual([
      'cancelled',
      'cancelled',
      'cancelled',
      'cancelled',
    ]);
  });
  it('marks earlier unsent reminders as skipped once a later one goes out', () => {
    const sent = [{ on: '2026-11-05', sentAt: '2026-11-06T04:00:00Z' }];
    expect(
      reminderStates(schedule, sent, { today: '2026-11-06', paid: false, enabled: true }).map(
        (r) => r.state,
      ),
    ).toEqual(['skipped', 'skipped', 'sent', 'scheduled']);
  });
  it('sends one reminder a day per invoice: the latest due', () => {
    const views = reminderStates(schedule, [], {
      today: '2026-11-06',
      paid: false,
      enabled: true,
    });
    expect(remindersToSend(views)?.label).toBe('3 days after');
    expect(
      remindersToSend(
        reminderStates(schedule, [], { today: '2026-10-01', paid: false, enabled: true }),
      ),
    ).toBeNull();
  });
});
