// Server only. The reminder job's work: find today's reminders and send them. A scheduled job
// (Inngest, with the database) calls runReminders once a day; each invoice gets at most one
// email a day, and a reminder is marked sent only after the provider accepts it.
import { remindersToSend, type ReminderView } from '@agency-os/core';
import { invoiceReminderEmail, type OutgoingEmail } from '../email';
import { invoiceReminders } from './index';
import { store } from './shared';
import type { Client, Invoice } from './types';
import { invoiceState, invoiceTotals, istDate } from './views';

export type DueReminder = {
  invoice: Invoice;
  client: Client;
  reminder: ReminderView;
};

export function dueReminders(now = new Date()): DueReminder[] {
  const s = store();
  return s.invoices.flatMap((invoice) => {
    const client = s.clients.find((c) => c.id === invoice.clientId);
    if (!invoice.number || !client?.email) return [];
    const totals = invoiceTotals(invoice, client, s.settings);
    const paid = invoiceState(invoice, totals.total.amountMinor, now).dueMinor <= 0n;
    const views = invoiceReminders(invoice, paid, now);
    const reminder = views ? remindersToSend(views) : null;
    return reminder ? [{ invoice, client, reminder }] : [];
  });
}

export async function runReminders(
  send: (email: OutgoingEmail) => Promise<{ ok: boolean }>,
  { origin, replyTo, now = new Date() }: { origin: string; replyTo?: string; now?: Date },
) {
  const s = store();
  let sent = 0;
  let failed = 0;
  for (const { invoice, client, reminder } of dueReminders(now)) {
    const totals = invoiceTotals(invoice, client, s.settings);
    const email = await invoiceReminderEmail({
      invoice,
      client,
      state: invoiceState(invoice, totals.total.amountMinor, now),
      settings: s.settings,
      kind: reminder.kind,
      payUrl: `${origin}/pay/${invoice.payToken}`,
    });
    const result = await send({ to: client.email!, replyTo, ...email });
    if (!result.ok) {
      failed++;
      continue;
    }
    invoice.remindersSent.push({ on: reminder.on, sentAt: now.toISOString() });
    sent++;
  }
  return { sent, failed, on: istDate(now) };
}
