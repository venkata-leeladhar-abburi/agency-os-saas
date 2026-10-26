import {
  applyPayment,
  convertMoney,
  dueDate,
  financialYear,
  formatDocumentNumber,
  formatAmount,
  invoiceType,
  isOverdue,
  reminderSchedule,
  type InvoiceStatus,
} from '@agency-os/core';
import { and, asc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import { checkPlanLimit, notify } from './platform';
import type { NotificationEvent } from './projects';
import {
  clients,
  invoiceItems,
  invoices,
  memberships,
  payments,
  projects,
  reminders,
  webhookEvents,
} from './schema';
import {
  getQuote,
  localDate,
  lutValidOn,
  monthStart,
  totalsFor,
  workspaceTax,
  type QuoteItemInput,
  type QuoteOptions,
} from './sales-docs';
import { newToken } from './tokens';

export type Invoice = typeof invoices.$inferSelect;
export type PaymentMethod = (typeof payments.$inferSelect)['method'];

export type InvoiceInput = QuoteOptions & {
  clientId: string;
  projectId?: string | null;
  quoteId?: string | null;
  proforma?: boolean;
  /** INR per unit of the invoice currency (decimal string), for invoices not in INR. */
  exchangeRate?: string | null;
  termsDays?: number;
  acceptPartial?: boolean;
  notes?: string | null;
  terms?: string | null;
  footer?: string | null;
  items: QuoteItemInput[];
  isExample?: boolean;
};

async function writeItems(tx: Tx, invoice: Invoice, items: QuoteItemInput[]) {
  if (items.length === 0) throw new AccountError('quote_items_required');
  let totals;
  try {
    totals = totalsFor(invoice, items);
  } catch (error) {
    throw new AccountError('quote_invalid', (error as Error).message);
  }
  await call(() => tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)));
  await call(() =>
    tx.insert(invoiceItems).values(
      totals.lines.map((l, i) => ({
        workspaceId: invoice.workspaceId,
        invoiceId: invoice.id,
        position: i,
        description: l.description.trim(),
        sacCode: l.sac ?? null,
        quantity: String(l.quantity),
        rateMinor: l.rateMinor,
        discountMinor: items[i]!.discountMinor ?? 0n,
        taxableMinor: l.taxableMinor,
        taxRateBp: l.taxRateBp,
        cgstMinor: l.cgstMinor,
        sgstMinor: l.sgstMinor,
        igstMinor: l.igstMinor,
        amountMinor: l.taxableMinor + l.cgstMinor + l.sgstMinor + l.igstMinor,
      })),
    ),
  );
  await call(() =>
    tx
      .update(invoices)
      .set({
        type: invoiceType(totals.treatment, invoice.proforma),
        subtotalMinor: totals.subtotal.amountMinor,
        cgstMinor: totals.cgst.amountMinor,
        sgstMinor: totals.sgst.amountMinor,
        igstMinor: totals.igst.amountMinor,
        roundOffMinor: totals.roundOff.amountMinor,
        totalMinor: totals.total.amountMinor,
      })
      .where(eq(invoices.id, invoice.id)),
  );
  return totals;
}

/** A draft invoice (no number yet), with GST worked out in packages/core. */
export async function createInvoice(
  tx: Tx,
  workspaceId: string,
  input: InvoiceInput,
  actorId: string,
  now = new Date(),
) {
  const ws = await workspaceTax(tx, workspaceId);
  const [client] = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.id, input.clientId), isNull(clients.deletedAt)));
  if (!client) throw new AccountError('client_not_found');
  const currency = (input.currency ?? client.currency).toUpperCase();
  const india = client.country === 'IN';
  const id = uuidv7();
  const [invoice] = await call(() =>
    tx
      .insert(invoices)
      .values({
        id,
        workspaceId,
        clientId: client.id,
        projectId: input.projectId ?? null,
        quoteId: input.quoteId ?? null,
        type: 'tax_invoice',
        proforma: input.proforma ?? false,
        currency,
        exchangeRate: currency === ws.baseCurrency ? null : (input.exchangeRate ?? null),
        baseCurrency: ws.baseCurrency,
        supplierStateCode: ws.gstin ? ws.stateCode : null,
        placeOfSupplyCode:
          input.placeOfSupplyCode !== undefined
            ? input.placeOfSupplyCode
            : india
              ? (client.stateCode ?? ws.stateCode)
              : null,
        exportCountry: india ? null : client.country,
        hasLut: input.hasLut ?? lutValidOn(ws, now),
        roundOff: input.roundOff ?? false,
        discountMinor: input.discountMinor ?? 0n,
        termsDays: input.termsDays ?? 7,
        acceptPartial: input.acceptPartial ?? true,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        footer: input.footer ?? 'Thank you for your business.',
        isExample: input.isExample ?? false,
        createdBy: actorId,
      })
      .returning(),
  );
  await writeItems(tx, invoice!, input.items);
  return id;
}

/** A draft invoice from a quote, with the same items, discount and tax settings. */
export async function invoiceFromQuote(
  tx: Tx,
  quoteId: string,
  input: { clientId?: string; projectId?: string | null; proforma?: boolean },
  actorId: string,
) {
  const quote = await getQuote(tx, quoteId);
  if (!quote) throw new AccountError('quote_not_found');
  const clientId = input.clientId ?? quote.clientId;
  if (!clientId) throw new AccountError('client_not_found');
  return createInvoice(
    tx,
    quote.workspaceId,
    {
      clientId,
      projectId: input.projectId ?? null,
      quoteId,
      proforma: input.proforma,
      currency: quote.currency,
      placeOfSupplyCode: quote.placeOfSupplyCode,
      hasLut: quote.hasLut,
      roundOff: quote.roundOff,
      discountMinor: quote.discountMinor,
      items: quote.items.map((i) => ({
        description: i.description,
        sacCode: i.sacCode,
        quantity: i.quantity,
        rateMinor: i.rateMinor,
        discountMinor: i.discountMinor,
        taxRateBp: i.taxRateBp,
      })),
    },
    actorId,
  );
}

export async function updateDraftInvoice(
  tx: Tx,
  invoiceId: string,
  input: Partial<Omit<InvoiceInput, 'clientId'>> & { items: QuoteItemInput[] },
) {
  const [current] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!current) throw new AccountError('invoice_not_found');
  if (current.status !== 'draft') throw new AccountError('invoice_locked');
  const { items, ...rest } = input;
  const [invoice] = await call(() =>
    tx
      .update(invoices)
      .set({
        ...(rest.currency ? { currency: rest.currency.toUpperCase() } : {}),
        ...(rest.exchangeRate !== undefined ? { exchangeRate: rest.exchangeRate } : {}),
        ...(rest.placeOfSupplyCode !== undefined
          ? { placeOfSupplyCode: rest.placeOfSupplyCode }
          : {}),
        ...(rest.hasLut !== undefined ? { hasLut: rest.hasLut } : {}),
        ...(rest.roundOff !== undefined ? { roundOff: rest.roundOff } : {}),
        ...(rest.discountMinor !== undefined ? { discountMinor: rest.discountMinor } : {}),
        ...(rest.termsDays !== undefined ? { termsDays: rest.termsDays } : {}),
        ...(rest.acceptPartial !== undefined ? { acceptPartial: rest.acceptPartial } : {}),
        ...(rest.notes !== undefined ? { notes: rest.notes } : {}),
        ...(rest.terms !== undefined ? { terms: rest.terms } : {}),
        ...(rest.footer !== undefined ? { footer: rest.footer } : {}),
        ...(rest.projectId !== undefined ? { projectId: rest.projectId } : {}),
      })
      .where(eq(invoices.id, invoiceId))
      .returning(),
  );
  return writeItems(tx, invoice!, items);
}

/** Invoices issued this month, for the Free plan's monthly limit. */
export async function issuedThisMonth(tx: Tx, workspaceId: string, now = new Date()) {
  const from = await monthStart(tx, workspaceId, now);
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        gte(invoices.issuedAt, from),
        eq(invoices.proforma, false),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Issues a draft: takes the next number (tax invoices and proformas in separate series), fixes
 * the bill-to details, sets the due date and reminders, and makes the client link. The invoice
 * can't change after this, only be cancelled.
 */
export async function issueInvoice(tx: Tx, invoiceId: string, actorId: string, now = new Date()) {
  const [inv] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), isNull(invoices.deletedAt)));
  if (!inv) throw new AccountError('invoice_not_found');
  if (inv.status !== 'draft') throw new AccountError('invoice_locked');
  const ws = await workspaceTax(tx, inv.workspaceId);
  if (!inv.proforma) {
    const check = await checkPlanLimit(tx, inv.workspaceId, 'invoices_per_month', 1, {
      used: await issuedThisMonth(tx, inv.workspaceId, now),
    });
    if (!check.allowed) throw new AccountError('plan_limit', check.message);
  }
  if (inv.currency !== inv.baseCurrency && !inv.exchangeRate)
    throw new AccountError('exchange_rate_required');
  const issueOn = localDate(now, ws.timeZone);
  const fy = financialYear(issueOn);
  const kind = inv.proforma ? 'proforma' : 'invoice';
  const [seq] = await call(() =>
    tx.execute<{ n: number }>(
      sql`select take_document_number(${inv.workspaceId}::uuid, ${kind}::document_kind, ${fy}) as n`,
    ),
  );
  const number = formatDocumentNumber(ws.invoicePrefix, inv.type, issueOn, seq!.n);
  const [client] = await tx.select().from(clients).where(eq(clients.id, inv.clientId));
  const due = dueDate(issueOn, inv.termsDays);
  const { token, hash } = newToken();
  await call(() =>
    tx
      .update(invoices)
      .set({
        status: 'issued',
        number,
        financialYear: fy,
        issueOn,
        dueOn: due,
        supplierGstin: ws.gstin,
        lutArn: inv.type === 'export_lut' ? ws.lutArn : null,
        billTo: {
          name: client!.name,
          legalName: client!.legalName,
          gstin: client!.gstin,
          stateCode: client!.stateCode,
          country: client!.country,
          address: client!.billingAddress,
        },
        totalBaseMinor: inv.exchangeRate
          ? convertMoney(
              { amountMinor: inv.totalMinor, currency: inv.currency },
              inv.exchangeRate,
              inv.baseCurrency,
            ).amountMinor
          : inv.totalMinor,
        publicTokenHash: hash,
        issuedAt: now,
        issuedBy: actorId,
      })
      .where(eq(invoices.id, invoiceId)),
  );
  if (!inv.proforma) {
    const schedule = reminderSchedule(issueOn, due);
    if (schedule.length)
      await tx.insert(reminders).values(
        schedule.map((r) => ({
          workspaceId: inv.workspaceId,
          invoiceId,
          kind: r.kind,
          scheduledFor: r.on,
        })),
      );
  }
  return { number, token, dueOn: due };
}

export async function cancelInvoice(tx: Tx, invoiceId: string, reason: string) {
  if (!reason.trim()) throw new AccountError('cancel_reason_required');
  const rows = await call(() =>
    tx
      .update(invoices)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: reason.trim() })
      .where(eq(invoices.id, invoiceId))
      .returning({ id: invoices.id }),
  );
  if (rows.length === 0) throw new AccountError('invoice_not_found');
  await tx
    .update(reminders)
    .set({ cancelledAt: new Date() })
    .where(and(eq(reminders.invoiceId, invoiceId), isNull(reminders.sentAt)));
}

/** Only drafts can be deleted. */
export async function deleteDraftInvoice(tx: Tx, invoiceId: string) {
  const rows = await call(() =>
    tx.delete(invoices).where(eq(invoices.id, invoiceId)).returning({ id: invoices.id }),
  );
  if (rows.length === 0) throw new AccountError('invoice_not_found');
}

export async function getInvoice(tx: Tx, invoiceId: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) return null;
  const items = await tx
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.position));
  const paid = await tx
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(asc(payments.createdAt));
  return { ...inv, items, payments: paid, dueMinor: inv.totalMinor - inv.amountPaidMinor };
}

export async function listInvoices(
  tx: Tx,
  workspaceId: string,
  f: { statuses?: InvoiceStatus[]; clientId?: string; projectId?: string; overdueOn?: string } = {},
) {
  const rows = await tx
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        isNull(invoices.deletedAt),
        f.statuses?.length ? inArray(invoices.status, f.statuses) : undefined,
        f.clientId ? eq(invoices.clientId, f.clientId) : undefined,
        f.projectId ? eq(invoices.projectId, f.projectId) : undefined,
      ),
    )
    .orderBy(sql`${invoices.issueOn} desc nulls first`, sql`${invoices.createdAt} desc`);
  const today = f.overdueOn ?? new Date().toISOString().slice(0, 10);
  const withFlag = rows.map((r) => ({
    ...r,
    overdue: isOverdue(r.status, r.dueOn, today),
    dueMinor: r.totalMinor - r.amountPaidMinor,
  }));
  return f.overdueOn ? withFlag.filter((r) => r.overdue) : withFlag;
}

// ---- Payments ----

async function paymentEvent(tx: Tx, inv: Invoice, amountMinor: bigint): Promise<NotificationEvent> {
  const people = await tx
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, inv.workspaceId),
        inArray(memberships.role, ['owner', 'finance']),
        eq(memberships.status, 'active'),
      ),
    );
  const [project] = inv.projectId
    ? await tx
        .select({ lead: projects.leadMemberId })
        .from(projects)
        .where(eq(projects.id, inv.projectId))
    : [];
  return {
    kind: 'payment.received',
    workspaceId: inv.workspaceId,
    userIds: [
      ...new Set([...people.map((p) => p.userId), ...(project?.lead ? [project.lead] : [])]),
    ],
    contactEmails: [],
    payload: {
      invoiceId: inv.id,
      number: inv.number,
      amount: formatAmount(amountMinor, inv.currency),
    },
  };
}

export type PaymentInput = {
  invoiceId: string;
  amountMinor: bigint;
  method: PaymentMethod;
  receivedOn: string;
  notes?: string | null;
  /** Storage path of a FIRA or FIRC for payments from abroad. */
  firaPath?: string | null;
};

/** Records a payment by hand (bank transfer, Wise, PayPal, cash). Messages come from core. */
export async function recordPayment(tx: Tx, input: PaymentInput) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, input.invoiceId));
  if (!inv) throw new AccountError('invoice_not_found');
  if (!['issued', 'partially_paid'].includes(inv.status) || inv.proforma)
    throw new AccountError('invoice_not_payable');
  const check = applyPayment(inv.totalMinor, inv.amountPaidMinor, input.amountMinor, (m) =>
    formatAmount(m, inv.currency),
  );
  if (!check.ok) throw new AccountError('payment_invalid', check.error);
  const [row] = await call(() =>
    tx.execute<{ id: string }>(
      sql`select record_invoice_payment(${inv.id}::uuid, ${input.amountMinor}, ${inv.currency}, ${input.method}::payment_method, ${input.receivedOn}::date, ${input.notes ?? null}, ${input.firaPath ?? null}, null, null) as id`,
    ),
  );
  return {
    paymentId: row!.id,
    status: check.status,
    dueMinor: check.dueMinor,
    events: [await paymentEvent(tx, inv, input.amountMinor)],
  };
}

export type RazorpayPaymentLinkEvent = {
  event: string;
  payload: {
    payment_link?: { entity: { id: string; reference_id?: string; status?: string } };
    payment?: { entity: { id: string; amount: number; currency: string; method?: string } };
  };
};

const METHODS: Record<string, PaymentMethod> = {
  upi: 'upi',
  card: 'card',
  netbanking: 'netbanking',
};

/** The invoice a payment-link event is for (we set reference_id to the invoice id). */
export function invoiceOfEvent(event: RazorpayPaymentLinkEvent) {
  return event.payload.payment_link?.entity.reference_id;
}

/**
 * Applies a Razorpay payment-link event once (keyed on the event id; the payment id is unique
 * too). Run as the service role for the invoice's workspace after the signature check.
 */
export async function applyRazorpayPaymentEvent(
  tx: Tx,
  workspaceId: string,
  eventId: string,
  event: RazorpayPaymentLinkEvent,
  now = new Date(),
) {
  const inserted = await tx
    .insert(webhookEvents)
    .values({ provider: 'razorpay', eventId, type: event.event, payload: event })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) return 'duplicate' as const;
  const done = () =>
    tx
      .update(webhookEvents)
      .set({ processedAt: now })
      .where(and(eq(webhookEvents.provider, 'razorpay'), eq(webhookEvents.eventId, eventId)));
  const payment = event.payload.payment?.entity;
  const invoiceId = invoiceOfEvent(event);
  if (
    !['payment_link.paid', 'payment_link.partially_paid'].includes(event.event) ||
    !payment ||
    !invoiceId
  ) {
    await done();
    return 'ignored' as const;
  }
  const [inv] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)));
  if (!inv) throw new Error('Payment event for an invoice outside this workspace');
  const ws = await workspaceTax(tx, workspaceId);
  const [row] = await call(() =>
    tx.execute<{ id: string | null }>(
      sql`select record_invoice_payment(${inv.id}::uuid, ${BigInt(payment.amount)}, ${payment.currency}, ${METHODS[payment.method ?? ''] ?? 'other'}::payment_method, ${localDate(now, ws.timeZone)}::date, null, null, 'razorpay', ${payment.id}) as id`,
    ),
  );
  if (row?.id) {
    const ev = await paymentEvent(tx, inv, BigInt(payment.amount));
    await notify(tx, { workspaceId, userIds: ev.userIds, kind: ev.kind, payload: ev.payload });
  }
  await done();
  return row?.id ? ('applied' as const) : ('duplicate' as const);
}

// ---- Reminders ----

/** Reminders due today or earlier that haven't gone out, for invoices still owed. Jobs only. */
export async function dueReminders(tx: Tx, workspaceId: string, today: string) {
  return tx
    .select({ reminder: reminders, invoice: invoices })
    .from(reminders)
    .innerJoin(invoices, eq(invoices.id, reminders.invoiceId))
    .where(
      and(
        eq(reminders.workspaceId, workspaceId),
        lte(reminders.scheduledFor, today),
        isNull(reminders.sentAt),
        isNull(reminders.cancelledAt),
        inArray(invoices.status, ['issued', 'partially_paid']),
      ),
    )
    .orderBy(asc(reminders.scheduledFor));
}

export async function markReminderSent(tx: Tx, reminderId: string, at = new Date()) {
  await tx.update(reminders).set({ sentAt: at }).where(eq(reminders.id, reminderId));
}

export type PortalInvoice = {
  id: string;
  clientId: string;
  number: string;
  type: string;
  status: InvoiceStatus;
  issueOn: string;
  dueOn: string;
  currency: string;
  totalMinor: string;
  paidMinor: string;
  dueMinor: string;
  overdue: boolean;
  payUrl: string | null;
  pdfPath: string | null;
};

export async function portalInvoices(tx: Tx): Promise<PortalInvoice[]> {
  const [row] = await tx.execute<{ i: PortalInvoice[] }>(sql`select portal_invoices() as i`);
  return row?.i ?? [];
}
