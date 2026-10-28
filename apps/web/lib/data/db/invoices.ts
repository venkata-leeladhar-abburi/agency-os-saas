// Server only. Invoices on the database, in the shapes the screens use (see ../index.ts for
// the example-mode versions). Every query runs as the member, so RLS decides what they see.
import {
  createInvoice as dbCreateInvoice,
  getClient,
  getInvoice as dbGetInvoice,
  checkPlanLimit,
  invoicePlanCheck,
  invoicesPaidIn,
  issueInvoice as dbIssueInvoice,
  listClients,
  listInvoices,
  localDate,
  nextInvoiceNumber,
  recordPayment as dbRecordPayment,
  replacePayLink,
  sentThisMonth,
  setInvoiceReminders as dbSetReminders,
  totalsOfInvoice,
  updateBranding,
  updateWorkspaceSettings,
  withService,
  workspaceSettings,
  queueInvoiceSent,
} from '@agency-os/db';
import { formatDate, formatMoney, type LimitedResource } from '@agency-os/core';
import type { InvoiceInput, PaymentInput, SettingsInput } from '../../forms';
import { emailsQueued } from '../../server/jobs';
import { asMember, linkSecret, type WorkspaceCtx } from '../../server/workspace';
import type { InvoiceRow } from '../index';
import { invoiceState } from '../views';
import { clientFromDb, invoiceFromDb, settingsFromDb } from './map';

export async function invoiceRows(ctx: WorkspaceCtx, now = new Date()): Promise<InvoiceRow[]> {
  const [rows, paidIds] = await asMember(
    ctx,
    async (tx) =>
      [
        await listInvoices(tx, ctx.workspaceId, now),
        await invoicesPaidIn(tx, ctx.workspaceId, localDate(now, 'Asia/Kolkata').slice(0, 7)),
      ] as const,
  );
  return rows.map((r) => {
    const status = r.status === 'issued' ? 'due' : r.status;
    return {
      id: r.id,
      number: r.number ?? 'Draft',
      client: r.clientName,
      clientId: r.clientId,
      amount: formatMoney(r.totalMinor, r.currency),
      issued: r.issueOn ? formatDate(r.issueOn, { year: false }) : '—',
      due: formatDate(r.dueOn, { year: false }),
      status: status === 'cancelled' ? 'draft' : status,
      statusText:
        r.status === 'cancelled'
          ? 'Cancelled'
          : statusText(r.status, r.dueOn, r.dueMinor, r.currency, now),
      paidThisMonth: paidIds.has(r.id),
    };
  });
}

function statusText(
  status: string,
  dueOn: string,
  dueMinor: bigint,
  currency: string,
  now: Date,
): string {
  if (status === 'draft') return 'Draft';
  if (status === 'paid') return 'Paid';
  if (status === 'overdue') {
    const days = Math.round(
      (Date.parse(localDate(now, 'Asia/Kolkata')) - Date.parse(dueOn)) / 86_400_000,
    );
    return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
  }
  if (status === 'partially_paid') return `${formatMoney(dueMinor, currency)} due`;
  return `Due ${formatDate(dueOn, { year: false })}`;
}

/** The invoice page: invoice, client, totals from its own stored snapshot, state, settings. */
export async function invoiceDetail(ctx: WorkspaceCtx, id: string, now = new Date()) {
  return asMember(ctx, async (tx) => {
    const found = await dbGetInvoice(tx, id, { secret: linkSecret(), now });
    if (!found || found.invoice.workspaceId !== ctx.workspaceId) return null;
    const client = await getClient(tx, found.invoice.clientId);
    const settings = settingsFromDb(await workspaceSettings(tx, ctx.workspaceId));
    const totals = totalsOfInvoice(found.row, found.items);
    const invoice = invoiceFromDb(
      found.invoice,
      found.items,
      found.payments,
      found.reminders,
      found.payToken,
    );
    return {
      invoice,
      client: clientFromDb(client!),
      totals,
      state: invoiceState(invoice, totals.total.amountMinor, now),
      settings,
      reminders: found.reminders,
    };
  });
}

/** The number the next issued invoice gets. */
export async function nextNumber(ctx: WorkspaceCtx, now = new Date()) {
  return asMember(ctx, (tx) => nextInvoiceNumber(tx, ctx.workspaceId, now));
}

export async function clientChoices(ctx: WorkspaceCtx) {
  const rows = await asMember(ctx, (tx) => listClients(tx, ctx.workspaceId));
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    currency: c.currency,
    country: c.country,
    stateCode: c.stateCode,
  }));
}

/** Saves a draft and, when asked, issues it in the same transaction. */
export async function createInvoiceFor(ctx: WorkspaceCtx, input: InvoiceInput, now = new Date()) {
  const id = await asMember(ctx, async (tx) => {
    const id = await dbCreateInvoice(
      tx,
      ctx.workspaceId,
      {
        clientId: input.clientId,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        dueOn: input.dueOn,
        reminders: input.reminders,
        items: input.lines.map((l) => ({
          description: l.description,
          sacCode: l.sac ?? null,
          quantity: l.quantity,
          rateMinor: l.rateMinor,
          discountMinor: l.discountMinor,
          taxRateBp: l.taxRateBp,
        })),
      },
      ctx.session.userId,
      now,
    );
    if (input.issue)
      await dbIssueInvoice(tx, id, ctx.session.userId, { secret: linkSecret(), now });
    return id;
  });
  if (input.issue) await invoiceSent(ctx, id);
  return id;
}

export async function issueInvoiceFor(ctx: WorkspaceCtx, id: string, now = new Date()) {
  const issued = await asMember(ctx, (tx) =>
    dbIssueInvoice(tx, id, ctx.session.userId, { secret: linkSecret(), now }),
  );
  await invoiceSent(ctx, id);
  return issued;
}

/** "Invoice [number] from [workspace]" to the client, once it's issued. */
async function invoiceSent(ctx: WorkspaceCtx, id: string) {
  const queued = await withService(ctx.db, ctx.workspaceId, (tx) => queueInvoiceSent(tx, id));
  if (queued) await emailsQueued(ctx.workspaceId);
}

export async function recordPaymentFor(ctx: WorkspaceCtx, id: string, input: PaymentInput) {
  return asMember(ctx, (tx) =>
    dbRecordPayment(
      tx,
      id,
      {
        amountMinor: input.amountMinor,
        receivedOn: input.receivedOn,
        method: input.method,
        reference: input.reference,
      },
      ctx.session.userId,
    ),
  );
}

export async function setRemindersFor(ctx: WorkspaceCtx, id: string, on: boolean) {
  return asMember(ctx, (tx) => dbSetReminders(tx, id, on));
}

export async function newPayLinkFor(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, (tx) => replacePayLink(tx, id, ctx.session.userId, linkSecret()));
}

/** Whether the plan has room for one more; invoices count those issued this month. */
export async function planRoom(ctx: WorkspaceCtx, resource: LimitedResource, now = new Date()) {
  return asMember(ctx, (tx) =>
    resource === 'invoices_per_month'
      ? invoicePlanCheck(tx, ctx.workspaceId, now)
      : resource === 'quotes_per_month' || resource === 'proposals_per_month'
        ? (async () =>
            checkPlanLimit(tx, ctx.workspaceId, resource, 1, {
              used: await sentThisMonth(
                tx,
                ctx.workspaceId,
                resource === 'quotes_per_month' ? 'quote' : 'proposal',
                now,
              ),
            }))()
        : checkPlanLimit(tx, ctx.workspaceId, resource),
  );
}

export async function settingsFor(ctx: WorkspaceCtx) {
  return asMember(ctx, async (tx) => settingsFromDb(await workspaceSettings(tx, ctx.workspaceId)));
}

export async function saveSettingsFor(ctx: WorkspaceCtx, input: SettingsInput) {
  return asMember(ctx, (tx) =>
    updateWorkspaceSettings(
      tx,
      ctx.workspaceId,
      {
        name: input.name,
        gstin: input.gstin,
        lutArn: input.lutArn,
        invoicePrefix: input.invoicePrefix,
        paymentTermsDays: input.paymentTermsDays,
        services: input.services,
        address: input.address,
        bank: input.bank,
        invoiceFooter: input.invoiceFooter,
      },
      ctx.session.userId,
    ),
  );
}

export async function saveBrandColourFor(ctx: WorkspaceCtx, colour: string | null) {
  return asMember(ctx, (tx) =>
    updateBranding(tx, ctx.workspaceId, { brandColor: colour }, ctx.session.userId),
  );
}

export async function clientFor(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, async (tx) => {
    const c = await getClient(tx, id);
    return c && c.workspaceId === ctx.workspaceId ? clientFromDb(c) : null;
  });
}
