// Server only. Database rows → the shapes the screens already use (lib/data/types.ts), so a
// page reads the same whether it's on example data or the database.
import type {
  Invoice as DbInvoice,
  InvoiceItem as DbInvoiceItem,
  Payment as DbPayment,
  WorkspaceSettings as DbSettings,
  getClient,
} from '@agency-os/db';
import type { ReminderView } from '@agency-os/core';
import type { Client, Invoice, WorkspaceSettings } from '../types';
import { NOTIFICATION_CATEGORIES } from '../types';
import { DEFAULT_INVOICE_FOOTER } from '../../forms';

const DEFAULT_PREFS = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.id, { inApp: c.inApp, email: c.email }]),
) as WorkspaceSettings['notificationPrefs'];

export function settingsFromDb(s: DbSettings): WorkspaceSettings {
  return {
    name: s.name,
    gstin: s.gstin,
    stateCode: s.stateCode,
    lutArn: s.lutArn,
    invoicePrefix: s.invoicePrefix,
    paymentTermsDays: s.paymentTermsDays,
    services: s.services,
    // Per-member notification settings come from notification_preferences (M6); these are
    // the defaults the settings screen starts from.
    notificationPrefs: DEFAULT_PREFS,
    onboardingDismissed: Boolean(s.onboarding?.dismissed),
    plan: s.plan,
    address: s.address,
    bank: s.bank,
    invoiceFooter: s.invoiceFooter ?? DEFAULT_INVOICE_FOOTER,
    brandColour: s.brandColor,
    // Logos live in Storage (the logos bucket); until it's set up there is no URL to show.
    logo: null,
  };
}

type DbClient = NonNullable<Awaited<ReturnType<typeof getClient>>>;

export function clientFromDb(c: DbClient): Client {
  const primary = c.contacts[0];
  const portal = c.contacts.find((x) => x.portalInvitedAt && !x.portalRevokedAt);
  const address = (c.billingAddress as { city?: string } | null) ?? null;
  return {
    id: c.id,
    name: c.name,
    contactName: primary?.name ?? c.name,
    email: primary?.email ?? null,
    phone: primary?.phone ?? null,
    city: address?.city ?? null,
    country: c.country,
    currency: c.currency,
    gstin: c.gstin,
    stateCode: c.stateCode,
    notes: c.notes ?? '',
    portal: portal ? (portal.userId ? 'active' : 'invited') : 'not_invited',
    portalVisitedAt: null,
    createdAt: c.createdAt.toISOString(),
    activities: [],
    example: c.isExample || undefined,
  };
}

export function invoiceFromDb(
  inv: Omit<DbInvoice, 'status'> & { status: string },
  items: DbInvoiceItem[],
  payments: DbPayment[],
  reminders: ReminderView[] | null,
  payToken: string | null,
): Invoice {
  return {
    id: inv.id,
    number: inv.number,
    clientId: inv.clientId,
    currency: inv.currency,
    issuedOn: inv.issueOn,
    dueOn: inv.dueOn,
    lines: items.map((i) => ({
      description: i.description,
      sac: i.sacCode ?? undefined,
      quantity: i.quantity,
      rateMinor: i.rateMinor,
      discountMinor: i.discountMinor,
      taxRateBp: i.taxRateBp,
    })),
    exchangeRate: inv.exchangeRate,
    payments: payments.map((p) => ({
      id: p.id,
      amountMinor: p.amountMinor,
      receivedOn: p.receivedOn,
      method: p.method,
      reference: p.reference,
    })),
    reminders: inv.remindersEnabled,
    remindersSent: (reminders ?? [])
      .filter((r) => r.state === 'sent' && r.sentAt)
      .map((r) => ({ on: r.on, sentAt: r.sentAt! })),
    payToken: payToken ?? '',
    createdAt: inv.createdAt.toISOString(),
    example: inv.isExample || undefined,
  };
}
