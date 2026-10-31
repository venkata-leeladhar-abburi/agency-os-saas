// Invoice reminders (defaults-and-content.md §4): on by default, by email, 3 days before the
// due date, on it, then 3 and 7 days after. Dates are calendar dates (YYYY-MM-DD).

export type ReminderKind = 'before_due' | 'on_due' | 'after_due';

export const REMINDER_OFFSETS: { kind: ReminderKind; days: number; label: string }[] = [
  { kind: 'before_due', days: -3, label: '3 days before the due date' },
  { kind: 'on_due', days: 0, label: 'On the due date' },
  { kind: 'after_due', days: 3, label: '3 days after' },
  { kind: 'after_due', days: 7, label: '7 days after' },
];

export type ScheduledReminder = { kind: ReminderKind; on: string; label: string };

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The reminders for an invoice. Ones that would fall before it was issued are left out. */
export function reminderSchedule(invoice: {
  issuedOn: string;
  dueOn: string;
}): ScheduledReminder[] {
  return REMINDER_OFFSETS.map(({ kind, days, label }) => ({
    kind,
    on: shift(invoice.dueOn, days),
    label,
  })).filter((r) => r.on > invoice.issuedOn);
}

export type ReminderState =
  /** Sent on its date. */
  | 'sent'
  /** Its date has come and it hasn't gone out yet. */
  | 'due'
  /** Still to come. */
  | 'scheduled'
  /** Passed over: a later reminder went out instead (one email a day at most). */
  | 'skipped'
  /** Not needed: the invoice is paid, or reminders are off. */
  | 'cancelled';

export type ReminderView = ScheduledReminder & { state: ReminderState; sentAt: string | null };

/**
 * Where each reminder stands today. A reminder already sent stays "sent" even after the
 * invoice is paid; the rest are cancelled once it's paid or reminders are switched off.
 */
export function reminderStates(
  schedule: ScheduledReminder[],
  sent: { on: string; sentAt: string }[],
  { today, paid, enabled }: { today: string; paid: boolean; enabled: boolean },
): ReminderView[] {
  const latestSent = sent.reduce((max, s) => (s.on > max ? s.on : max), '');
  return schedule.map((r) => {
    const done = sent.find((s) => s.on === r.on);
    if (done) return { ...r, state: 'sent', sentAt: done.sentAt };
    if (r.on < latestSent) return { ...r, state: 'skipped', sentAt: null };
    if (paid || !enabled) return { ...r, state: 'cancelled', sentAt: null };
    return { ...r, state: r.on <= today ? 'due' : 'scheduled', sentAt: null };
  });
}

/**
 * The reminders a job should send today: due ones only, at most one per invoice (the
 * latest), so an invoice that's been waiting never gets a burst of emails at once.
 */
export function remindersToSend(views: ReminderView[]): ReminderView | null {
  const due = views.filter((v) => v.state === 'due');
  return due.length ? due[due.length - 1]! : null;
}
