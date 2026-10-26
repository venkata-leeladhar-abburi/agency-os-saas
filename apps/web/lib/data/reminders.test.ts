import { beforeEach, describe, expect, it } from 'vitest';
import type { OutgoingEmail } from '../email';
import { resetExampleStore } from './example-store';
import { getInvoice, setInvoiceReminders } from './index';
import { dueReminders, runReminders } from './reminders';

beforeEach(() => {
  resetExampleStore();
});

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

describe('invoice reminders', () => {
  it('shows the example schedule: three sent, the next one still to come', async () => {
    const inv = (await getInvoice('inv-14'))!;
    expect(inv.reminders!.map((r) => r.state)).toEqual(['sent', 'sent', 'sent', 'scheduled']);
    expect((await getInvoice('inv-draft'))!.reminders).toBeNull();
    // Paid: what went out stays, nothing more is needed.
    expect((await getInvoice('inv-13'))!.reminders!.map((r) => r.state)).toEqual([
      'sent',
      'cancelled',
      'cancelled',
      'cancelled',
    ]);
  });

  it('sends one email per invoice on the day, then not again', async () => {
    const outbox: OutgoingEmail[] = [];
    const send = async (e: OutgoingEmail) => {
      outbox.push(e);
      return { ok: true };
    };
    // Five days on: OSS/26-27/015's "3 days before" (day 4) is due.
    const now = inDays(5);
    expect(dueReminders(now).map((d) => d.invoice.number)).toContain('OSS/26-27/015');
    const first = await runReminders(send, { origin: 'https://app.example', now });
    expect(first.failed).toBe(0);
    const mail = outbox.find((m) => m.subject.includes('OSS/26-27/015'))!;
    expect(mail.to).toBe('srinivas@acmelabs.example');
    expect(mail.subject).toMatch(/^Invoice OSS\/26-27\/015 is due on /);
    expect(mail.html).toContain('https://app.example/pay/example-pay-15-K7d2Qx');
    const again = await runReminders(send, { origin: 'https://app.example', now });
    expect(again.sent).toBe(0);
  });

  it('keeps a reminder due when the provider refuses it, and skips when switched off', async () => {
    const now = inDays(5);
    const refused = await runReminders(async () => ({ ok: false }), {
      origin: 'https://app.example',
      now,
    });
    expect(refused.sent).toBe(0);
    expect(refused.failed).toBeGreaterThan(0);
    expect(dueReminders(now).length).toBe(refused.failed);
    await setInvoiceReminders('inv-15', false);
    expect(dueReminders(now).map((d) => d.invoice.id)).not.toContain('inv-15');
  });
});
