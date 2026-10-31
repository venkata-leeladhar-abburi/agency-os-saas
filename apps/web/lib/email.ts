// Server only. Email sending: Resend, once RESEND_API_KEY and EMAIL_FROM are set.
import { formatDate, formatMoney, type ReminderView } from '@agency-os/core';
import { renderInvoiceReminder } from '@agency-os/emails';
import { reviewBrandColour } from './branding';
import type { Client, Invoice, WorkspaceSettings } from './data/types';
import type { InvoiceState } from './data/views';

export function emailReady(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** The reminder for one invoice, as the client would get it. */
export function invoiceReminderEmail(p: {
  invoice: Invoice;
  client: Client;
  state: InvoiceState;
  settings: WorkspaceSettings;
  kind: ReminderView['kind'];
  payUrl: string;
}) {
  const colour = p.settings.brandColour;
  return renderInvoiceReminder({
    agency: { name: p.settings.name, logoUrl: p.settings.logo?.url ?? null },
    buttonColour: colour && reviewBrandColour(colour).usable ? colour : null,
    contactName: p.client.contactName,
    number: p.invoice.number!,
    amountDue: formatMoney(p.state.dueMinor, p.invoice.currency),
    dueDate: formatDate(p.invoice.dueOn),
    kind: p.kind,
    payUrl: p.payUrl,
  });
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Replies go to the agency, not to Agency OS. */
  replyTo?: string;
};

/** Sends through Resend's API. Only call when emailReady(). */
export async function sendEmail(email: OutgoingEmail): Promise<{ ok: boolean; id?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });
  if (!res.ok) return { ok: false };
  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: body.id };
}
