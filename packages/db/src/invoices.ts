// Invoices and payments (M13): drafts, issuing with the next number, payments, reminders, the
// pay link and the client portal's view. Tax comes from packages/core; what can't change once
// issued is enforced by the database (migrations/0015_money_rls.sql).
import {
  calculateInvoice,
  financialYear,
  formatInvoiceNumber,
  reminderSchedule,
  reminderStates,
  remindersToSend,
  type InvoiceTotals,
  type PlaceOfSupply,
  type ReminderView,
} from '@agency-os/core';
import { and, asc, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import { withService, type Db, type Tx } from './client';
import { queueEmails, queueEventEmails } from './email';
import { checkPlanLimit, notify } from './platform';
import {
  auditLog,
  clientContacts,
  clients,
  invoiceItems,
  invoices,
  memberships,
  payments,
  reminders,
  workspaces,
} from './schema';
import { hashToken, linkToken } from './tokens';

export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentMethod = Payment['method'];

export type InvoiceItemInput = {
  description: string;
  sacCode?: string | null;
  quantity: string | number;
  rateMinor: bigint;
  discountMinor?: bigint;
  taxRateBp: number;
};

export type InvoiceInput = {
  clientId: string;
  projectId?: string | null;
  quoteId?: string | null;
  /** Defaults to the client's currency. */
  currency?: string;
  /** Base currency per unit of the invoice currency, for invoices in another currency. */
  exchangeRate?: string | null;
  dueOn: string;
  items: InvoiceItemInput[];
  roundOff?: boolean;
  notes?: string | null;
  /** Email reminders around the due date; on unless switched off. */
  reminders?: boolean;
  /** Example data: stays a draft, never issued (see example-data.ts). */
  isExample?: boolean;
};

/** "Overdue" isn't stored: an issued or partly paid invoice past its due date. */
export type InvoiceView = Omit<Invoice, 'status'> & {
  status: Invoice['status'] | 'overdue';
  dueMinor: bigint;
};

const LINK_SCOPE = 'invoice';

/** The calendar date in a time zone, YYYY-MM-DD. */
export function localDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

async function workspaceOf(tx: Tx, workspaceId: string) {
  const [ws] = await tx.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!ws) throw new AccountError('no_access');
  return ws;
}

function lutValidOn(ws: typeof workspaces.$inferSelect, day: string) {
  return Boolean(
    ws.lutArn && ws.lutValidFrom && ws.lutValidTo && ws.lutValidFrom <= day && day <= ws.lutValidTo,
  );
}

function placeOf(i: Pick<Invoice, 'placeOfSupplyCode' | 'exportCountry'>): PlaceOfSupply {
  return i.placeOfSupplyCode
    ? { kind: 'india', stateCode: i.placeOfSupplyCode }
    : { kind: 'export', country: i.exportCountry ?? 'ZZ' };
}

type TaxFields = Pick<
  Invoice,
  | 'currency'
  | 'supplierStateCode'
  | 'placeOfSupplyCode'
  | 'exportCountry'
  | 'hasLut'
  | 'roundOff'
  | 'exchangeRate'
>;

function totalsFor(i: TaxFields, items: InvoiceItemInput[]): InvoiceTotals {
  return calculateInvoice({
    currency: i.currency,
    supplierStateCode: i.supplierStateCode ?? undefined,
    placeOfSupply: placeOf(i),
    hasValidLut: i.hasLut,
    roundOff: i.roundOff,
    exchangeRateToInr: i.exchangeRate ?? undefined,
    lines: items.map((x) => ({
      description: x.description,
      sac: x.sacCode ?? undefined,
      quantity: x.quantity,
      rateMinor: x.rateMinor,
      discountMinor: x.discountMinor,
      taxRateBp: x.taxRateBp,
    })),
  });
}

/**
 * An invoice's totals from what it stored when made (place of supply, LUT, rate) and its
 * lines, so an issued invoice shows what it said even if the settings change later.
 */
export function totalsOfInvoice(invoice: Invoice, items: InvoiceItem[]): InvoiceTotals {
  return totalsFor(
    invoice,
    items.map((i) => ({
      description: i.description,
      sacCode: i.sacCode,
      quantity: i.quantity,
      rateMinor: i.rateMinor,
      discountMinor: i.discountMinor,
      taxRateBp: i.taxRateBp,
    })),
  );
}

async function writeItems(tx: Tx, invoice: Invoice, items: InvoiceItemInput[]) {
  if (items.length === 0) throw new AccountError('invoice_items_required');
  let totals: InvoiceTotals;
  try {
    totals = totalsFor(invoice, items);
  } catch (error) {
    throw new AccountError('invoice_invalid', (error as Error).message);
  }
  await call(() => tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)));
  await call(() =>
    tx.insert(invoiceItems).values(
      totals.lines.map((l, n) => ({
        workspaceId: invoice.workspaceId,
        invoiceId: invoice.id,
        position: n,
        description: l.description.trim(),
        sacCode: l.sac ?? null,
        quantity: String(l.quantity),
        rateMinor: l.rateMinor,
        discountMinor: items[n]!.discountMinor ?? 0n,
        taxRateBp: l.taxRateBp,
        taxableMinor: l.taxableMinor,
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
        type: totals.documentType,
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

/**
 * A draft invoice for a client. Currency and place of supply come from the client; GST, the
 * document type (tax invoice, export invoice, bill of supply) and the totals from packages/core.
 */
export async function createInvoice(
  tx: Tx,
  workspaceId: string,
  input: InvoiceInput,
  actorId: string,
  now = new Date(),
): Promise<string> {
  const ws = await workspaceOf(tx, workspaceId);
  const [c] = await tx.select().from(clients).where(eq(clients.id, input.clientId));
  if (!c || c.workspaceId !== workspaceId) throw new AccountError('client_not_found');
  const currency = (input.currency ?? c.currency).toUpperCase();
  if (currency !== ws.baseCurrency && input.exchangeRate === undefined)
    throw new AccountError('exchange_rate_required');
  const india = c.country === 'IN';
  const id = uuidv7();
  const [invoice] = await call(() =>
    tx
      .insert(invoices)
      .values({
        id,
        workspaceId,
        clientId: c.id,
        projectId: input.projectId ?? null,
        quoteId: input.quoteId ?? null,
        // Worked out from the lines just below.
        type: 'tax_invoice',
        currency,
        exchangeRate: currency === ws.baseCurrency ? null : (input.exchangeRate ?? null),
        baseCurrency: ws.baseCurrency,
        supplierStateCode: ws.gstin ? ws.stateCode : null,
        placeOfSupplyCode: india ? (c.stateCode ?? ws.stateCode) : null,
        exportCountry: india ? null : c.country,
        hasLut: !india && lutValidOn(ws, localDate(now, ws.timeZone)),
        lutArn: !india && lutValidOn(ws, localDate(now, ws.timeZone)) ? ws.lutArn : null,
        roundOff: input.roundOff ?? false,
        dueOn: input.dueOn,
        notes: input.notes ?? null,
        remindersEnabled: input.reminders ?? true,
        isExample: input.isExample ?? false,
        createdBy: actorId,
      })
      .returning(),
  );
  await writeItems(tx, invoice!, input.items);
  return id;
}

/** Replaces a draft's items and options and recalculates. */
export async function updateInvoice(
  tx: Tx,
  invoiceId: string,
  input: Partial<Omit<InvoiceInput, 'clientId'>> & { items: InvoiceItemInput[] },
) {
  const [current] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!current) throw new AccountError('invoice_not_found');
  if (current.status !== 'draft') throw new AccountError('invoice_locked');
  const changes = {
    ...(input.dueOn ? { dueOn: input.dueOn } : {}),
    ...(input.exchangeRate !== undefined ? { exchangeRate: input.exchangeRate } : {}),
    ...(input.roundOff !== undefined ? { roundOff: input.roundOff } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.reminders !== undefined ? { remindersEnabled: input.reminders } : {}),
  };
  const invoice = Object.keys(changes).length
    ? (
        await call(() =>
          tx.update(invoices).set(changes).where(eq(invoices.id, invoiceId)).returning(),
        )
      )[0]!
    : current;
  return writeItems(tx, invoice, input.items);
}

/** Invoices issued in this calendar month (the workspace's time zone), cancelled ones included. */
async function issuedThisMonth(tx: Tx, workspaceId: string, timeZone: string, now: Date) {
  const [y, m] = localDate(now, timeZone).split('-').map(Number) as [number, number];
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        gte(invoices.issueOn, first),
        lt(invoices.issueOn, next),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Issues a draft: the next number in the financial year's series (consecutive, row-locked),
 * today's date, and a pay link. Counts towards the plan's invoices a month.
 */
export async function issueInvoice(
  tx: Tx,
  invoiceId: string,
  actorId: string,
  { secret, now = new Date() }: { secret: string; now?: Date },
) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for('update');
  if (!inv) throw new AccountError('invoice_not_found');
  if (inv.status !== 'draft') throw new AccountError('invoice_locked');
  if (inv.isExample) throw new AccountError('example_invoice_draft');
  const ws = await workspaceOf(tx, inv.workspaceId);
  const check = await checkPlanLimit(tx, inv.workspaceId, 'invoices_per_month', 1, {
    used: await issuedThisMonth(tx, inv.workspaceId, ws.timeZone, now),
  });
  if (!check.allowed) throw new AccountError('plan_limit', check.message);
  const today = localDate(now, ws.timeZone);
  const fy = financialYear(today);
  const [seq] = await call(() =>
    tx.execute<{ n: number }>(
      sql`select take_document_number(${inv.workspaceId}::uuid, 'invoice', ${fy}) as n`,
    ),
  );
  const number = formatInvoiceNumber(ws.invoicePrefix, today, seq!.n);
  const token = linkToken(secret, LINK_SCOPE, inv.id, inv.linkVersion);
  await call(() =>
    tx
      .update(invoices)
      .set({
        status: 'issued',
        number,
        financialYear: fy,
        issueOn: today,
        publicTokenHash: hashToken(token),
      })
      .where(eq(invoices.id, inv.id)),
  );
  await tx.insert(auditLog).values({
    workspaceId: inv.workspaceId,
    actorId,
    action: 'invoice.issued',
    subjectType: 'invoice',
    subjectId: inv.id,
    changes: { number, totalMinor: inv.totalMinor.toString(), currency: inv.currency },
  });
  return { number, token };
}

/** The pay link's token for an issued invoice, worked out again from the secret. */
export function payLinkToken(secret: string, inv: Pick<Invoice, 'id' | 'linkVersion'>) {
  return linkToken(secret, LINK_SCOPE, inv.id, inv.linkVersion);
}

/** A new pay link: the old one stops working at once. */
export async function replacePayLink(tx: Tx, invoiceId: string, actorId: string, secret: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) throw new AccountError('invoice_not_found');
  if (inv.status === 'draft' || inv.status === 'cancelled')
    throw new AccountError('invoice_no_link');
  const version = inv.linkVersion + 1;
  const token = linkToken(secret, LINK_SCOPE, inv.id, version);
  await call(() =>
    tx
      .update(invoices)
      .set({ linkVersion: version, publicTokenHash: hashToken(token) })
      .where(eq(invoices.id, inv.id)),
  );
  await tx.insert(auditLog).values({
    workspaceId: inv.workspaceId,
    actorId,
    action: 'invoice.link_replaced',
    subjectType: 'invoice',
    subjectId: inv.id,
    changes: { number: inv.number },
  });
  return token;
}

export async function setInvoiceReminders(tx: Tx, invoiceId: string, on: boolean) {
  const [row] = await call(() =>
    tx
      .update(invoices)
      .set({ remindersEnabled: on })
      .where(eq(invoices.id, invoiceId))
      .returning({ id: invoices.id }),
  );
  if (!row) throw new AccountError('invoice_not_found');
}

/** Cancels an issued invoice (its number stays used); a draft is deleted instead. */
export async function cancelInvoice(tx: Tx, invoiceId: string, actorId: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) throw new AccountError('invoice_not_found');
  if (inv.status === 'draft') {
    await call(() => tx.delete(invoices).where(eq(invoices.id, invoiceId)));
    return 'deleted' as const;
  }
  if (inv.amountPaidMinor > 0n) throw new AccountError('invoice_has_payments');
  await call(() =>
    tx
      .update(invoices)
      .set({ status: 'cancelled', publicTokenHash: null })
      .where(eq(invoices.id, invoiceId)),
  );
  await tx.insert(auditLog).values({
    workspaceId: inv.workspaceId,
    actorId,
    action: 'invoice.cancelled',
    subjectType: 'invoice',
    subjectId: inv.id,
    changes: { number: inv.number },
  });
  return 'cancelled' as const;
}

export type PaymentInput = {
  amountMinor: bigint;
  receivedOn: string;
  method: PaymentMethod;
  reference?: string | null;
};

/**
 * Records money received by hand (bank transfer, Wise, cash…). The database refuses more than
 * is due and moves the invoice to partly paid or paid.
 */
export async function recordPayment(
  tx: Tx,
  invoiceId: string,
  input: PaymentInput,
  actorId: string,
) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) throw new AccountError('invoice_not_found');
  const id = uuidv7();
  await call(() =>
    tx.insert(payments).values({
      id,
      workspaceId: inv.workspaceId,
      invoiceId,
      amountMinor: input.amountMinor,
      currency: inv.currency,
      method: input.method,
      receivedOn: input.receivedOn,
      reference: input.reference ?? null,
      recordedBy: actorId,
    }),
  );
  await tx.insert(auditLog).values({
    workspaceId: inv.workspaceId,
    actorId,
    action: 'payment.recorded',
    subjectType: 'invoice',
    subjectId: inv.id,
    changes: {
      number: inv.number,
      amountMinor: input.amountMinor.toString(),
      method: input.method,
    },
  });
  return id;
}

function view(inv: Invoice, today: string): InvoiceView {
  const dueMinor = inv.totalMinor - inv.amountPaidMinor;
  const late = (inv.status === 'issued' || inv.status === 'partially_paid') && inv.dueOn < today;
  return { ...inv, status: late ? 'overdue' : inv.status, dueMinor };
}

/** Invoices the user may see, newest first, with "overdue" worked out for today. */
export async function listInvoices(tx: Tx, workspaceId: string, now = new Date()) {
  const ws = await workspaceOf(tx, workspaceId);
  const today = localDate(now, ws.timeZone);
  const rows = await tx
    .select({ invoice: invoices, clientName: clients.name })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(eq(invoices.workspaceId, workspaceId), isNull(invoices.deletedAt)))
    .orderBy(desc(invoices.createdAt));
  return rows.map((r) => ({ ...view(r.invoice, today), clientName: r.clientName }));
}

/** One invoice with its lines, payments, client, reminders and (when issued) its pay link. */
export async function getInvoice(
  tx: Tx,
  invoiceId: string,
  { secret, now = new Date() }: { secret?: string; now?: Date } = {},
) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) return null;
  const ws = await workspaceOf(tx, inv.workspaceId);
  const today = localDate(now, ws.timeZone);
  const [client] = await tx.select().from(clients).where(eq(clients.id, inv.clientId));
  const items = await tx
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, inv.id))
    .orderBy(asc(invoiceItems.position));
  const paid = await tx
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, inv.id))
    .orderBy(asc(payments.receivedOn), asc(payments.createdAt));
  const sent = await tx.select().from(reminders).where(eq(reminders.invoiceId, inv.id));
  return {
    invoice: view(inv, today),
    /** The stored row, for totalsOfInvoice. */
    row: inv,
    client: client!,
    items,
    payments: paid,
    reminders: reminderViews(inv, sent, today),
    payToken:
      secret && inv.publicTokenHash && inv.status !== 'cancelled'
        ? payLinkToken(secret, inv)
        : null,
  };
}

function reminderViews(
  inv: Invoice,
  sent: { scheduledFor: string; sentAt: Date }[],
  today: string,
): ReminderView[] | null {
  if (!inv.issueOn || inv.status === 'cancelled') return null;
  return reminderStates(
    reminderSchedule({ issuedOn: inv.issueOn, dueOn: inv.dueOn }),
    sent.map((s) => ({ on: s.scheduledFor, sentAt: s.sentAt.toISOString() })),
    { today, paid: inv.status === 'paid', enabled: inv.remindersEnabled },
  );
}

// ---- The daily reminder job (service role, one workspace at a time) ----

/** Today's reminders for a workspace: at most one per invoice, only to clients with an email. */
export async function remindersDue(db: Db, workspaceId: string, now = new Date()) {
  return withService(db, workspaceId, async (tx, ws) => {
    const w = await workspaceOf(tx, ws);
    const today = localDate(now, w.timeZone);
    // Reminders go to the client's primary contact.
    const open = await tx
      .select({ invoice: invoices, email: clientContacts.email })
      .from(invoices)
      .leftJoin(
        clientContacts,
        and(eq(clientContacts.clientId, invoices.clientId), eq(clientContacts.isPrimary, true)),
      )
      .where(
        and(
          eq(invoices.workspaceId, ws),
          eq(invoices.remindersEnabled, true),
          sql`${invoices.status} in ('issued', 'partially_paid')`,
          isNull(invoices.deletedAt),
        ),
      );
    const out: { invoiceId: string; email: string; reminder: ReminderView }[] = [];
    for (const { invoice, email } of open) {
      if (!email) continue;
      const sent = await tx.select().from(reminders).where(eq(reminders.invoiceId, invoice.id));
      const views = reminderViews(invoice, sent, today);
      const next = views ? remindersToSend(views) : null;
      if (next) out.push({ invoiceId: invoice.id, email, reminder: next });
    }
    return out;
  });
}

/** Marks a reminder sent, once the email provider has accepted it. Idempotent per day. */
export async function markReminderSent(
  db: Db,
  workspaceId: string,
  invoiceId: string,
  reminder: Pick<ReminderView, 'kind' | 'on'>,
  providerMessageId: string | null,
  now = new Date(),
) {
  return withService(db, workspaceId, async (tx, ws) => {
    await tx
      .insert(reminders)
      .values({
        workspaceId: ws,
        invoiceId,
        kind: reminder.kind,
        scheduledFor: reminder.on,
        sentAt: now,
        providerMessageId,
      })
      .onConflictDoNothing();
  });
}

// ---- The pay link (public: the token is the key) ----

async function linkWorkspace(db: Db, token: string) {
  const workspaceId = await db.transaction(async (tx) => {
    await tx.execute(sql`set local role anon`);
    const [row] = await tx.execute<{ ws: string | null }>(
      sql`select invoice_link_workspace(${hashToken(token)}) as ws`,
    );
    return row?.ws ?? null;
  });
  if (!workspaceId) throw new AccountError('invoice_link_invalid');
  return workspaceId;
}

/** What the pay page shows: the agency, the invoice, its lines and payments. */
export async function invoiceByLink(db: Db, token: string, now = new Date()) {
  const workspaceId = await linkWorkspace(db, token);
  return withService(db, workspaceId, async (tx, ws) => {
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.workspaceId, ws), eq(invoices.publicTokenHash, hashToken(token))));
    if (!inv) throw new AccountError('invoice_link_invalid');
    const w = await workspaceOf(tx, ws);
    const [client] = await tx.select().from(clients).where(eq(clients.id, inv.clientId));
    const items = await tx
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, inv.id))
      .orderBy(asc(invoiceItems.position));
    const paid = await tx
      .select({
        amountMinor: payments.amountMinor,
        method: payments.method,
        receivedOn: payments.receivedOn,
      })
      .from(payments)
      .where(eq(payments.invoiceId, inv.id))
      .orderBy(asc(payments.receivedOn));
    return {
      workspace: {
        name: w.name,
        logoPath: w.logoPath,
        brandColor: w.brandColor,
        plan: w.plan,
        gstin: w.gstin,
        address: w.address,
      },
      invoice: view(inv, localDate(now, w.timeZone)),
      client: { name: client!.name, gstin: client!.gstin, country: client!.country },
      items,
      payments: paid,
    };
  });
}

/**
 * A payment made through the pay link (Razorpay's webhook, service role). Idempotent on the
 * provider's payment id; notifies the agency's owners.
 */
export async function recordOnlinePayment(
  db: Db,
  workspaceId: string,
  input: {
    invoiceId: string;
    amountMinor: bigint;
    method: PaymentMethod;
    provider: string;
    providerPaymentId: string;
    receivedOn: string;
  },
) {
  return withService(db, workspaceId, async (tx, ws) => {
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.workspaceId, ws)));
    if (!inv) throw new AccountError('invoice_not_found');
    const inserted = await call(() =>
      tx
        .insert(payments)
        .values({
          workspaceId: ws,
          invoiceId: inv.id,
          amountMinor: input.amountMinor,
          currency: inv.currency,
          method: input.method,
          provider: input.provider,
          providerPaymentId: input.providerPaymentId,
          receivedOn: input.receivedOn,
        })
        .onConflictDoNothing({ target: payments.providerPaymentId })
        .returning({ id: payments.id }),
    );
    if (!inserted.length) return { duplicate: true as const };
    const owners = await tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.workspaceId, ws),
          sql`${memberships.role} in ('owner', 'finance')`,
          eq(memberships.status, 'active'),
        ),
      );
    const event = {
      kind: 'payment.received' as const,
      key: input.providerPaymentId,
      workspaceId: ws,
      userIds: owners.map((o) => o.userId),
      contactEmails: [],
      payload: {
        invoiceId: inv.id,
        number: inv.number,
        amountMinor: input.amountMinor.toString(),
        currency: inv.currency,
      },
    };
    const sent = await notify(tx, event);
    await queueEventEmails(tx, event, sent.email);
    return { duplicate: false as const };
  });
}

// ---- The client portal ----

export type PortalInvoiceFull = TaxFields & {
  id: string;
  clientId: string;
  workspaceId: string;
  number: string;
  status: Invoice['status'];
  issueOn: string;
  dueOn: string;
  items: (InvoiceItemInput & { sacCode: string | null; discountMinor: bigint })[];
  payments: { id: string; amountMinor: bigint; method: string; receivedOn: string }[];
  totals: InvoiceTotals;
};

/**
 * The signed-in contact's issued invoices in full (lines, payments and the totals they were
 * issued with), as the portal shows and prints them.
 */
export async function portalInvoiceList(tx: Tx): Promise<PortalInvoiceFull[]> {
  const [row] = await tx.execute<{ list: Record<string, unknown>[] }>(
    sql`select portal_invoices() as list`,
  );
  return (row?.list ?? []).map((x) => {
    const tax: TaxFields = {
      currency: x.currency as string,
      supplierStateCode: (x.supplierStateCode as string | null) ?? null,
      placeOfSupplyCode: (x.placeOfSupplyCode as string | null) ?? null,
      exportCountry: (x.exportCountry as string | null) ?? null,
      hasLut: Boolean(x.hasLut),
      roundOff: Boolean(x.roundOff),
      exchangeRate: x.exchangeRate === null ? null : String(x.exchangeRate),
    };
    const items = ((x.items as Record<string, unknown>[] | null) ?? []).map((it) => ({
      description: it.description as string,
      sacCode: (it.sacCode as string | null) ?? null,
      quantity: String(it.quantity),
      rateMinor: BigInt(it.rateMinor as string),
      discountMinor: BigInt(it.discountMinor as string),
      taxRateBp: it.taxRateBp as number,
    }));
    return {
      ...tax,
      id: x.id as string,
      clientId: x.clientId as string,
      workspaceId: x.workspaceId as string,
      number: x.number as string,
      status: x.status as Invoice['status'],
      issueOn: x.issueOn as string,
      dueOn: x.dueOn as string,
      items,
      payments: ((x.payments as Record<string, unknown>[] | null) ?? []).map((p) => ({
        id: p.id as string,
        amountMinor: BigInt(p.amountMinor as string),
        method: p.method as string,
        receivedOn: p.receivedOn as string,
      })),
      totals: totalsFor(tax, items),
    };
  });
}

export type PortalInvoice = {
  id: string;
  clientId: string;
  workspaceId: string;
  number: string;
  type: Invoice['type'];
  status: Invoice['status'];
  currency: string;
  dueOn: string;
  issueOn: string;
  totalMinor: bigint;
  amountPaidMinor: bigint;
};

/** The signed-in contact's issued invoices across the clients they're a contact for. */
export async function portalInvoices(tx: Tx): Promise<PortalInvoice[]> {
  const [row] = await tx.execute<{ list: Record<string, unknown>[] }>(
    sql`select portal_invoices() as list`,
  );
  return (row?.list ?? []).map((x) => ({
    id: x.id as string,
    clientId: x.clientId as string,
    workspaceId: x.workspaceId as string,
    number: x.number as string,
    type: x.type as Invoice['type'],
    status: x.status as Invoice['status'],
    currency: x.currency as string,
    dueOn: x.dueOn as string,
    issueOn: x.issueOn as string,
    totalMinor: BigInt(x.totalMinor as string),
    amountPaidMinor: BigInt(x.amountPaidMinor as string),
  }));
}

/** The number the next issued invoice gets (a preview: issuing takes it for real). */
export async function nextInvoiceNumber(tx: Tx, workspaceId: string, now = new Date()) {
  const ws = await workspaceOf(tx, workspaceId);
  const today = localDate(now, ws.timeZone);
  const fy = financialYear(today);
  // Every number taken belongs to an invoice row (taking one and issuing share a transaction).
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.workspaceId, workspaceId), eq(invoices.financialYear, fy)));
  return formatInvoiceNumber(ws.invoicePrefix, today, (row?.n ?? 0) + 1);
}

/** Invoices with a payment received in a calendar month ("YYYY-MM"), for "Received". */
export async function invoicesPaidIn(tx: Tx, workspaceId: string, month: string) {
  const rows = await tx
    .selectDistinct({ id: payments.invoiceId })
    .from(payments)
    .where(
      and(
        eq(payments.workspaceId, workspaceId),
        gte(payments.receivedOn, `${month}-01`),
        sql`${payments.receivedOn} < (${`${month}-01`}::date + interval '1 month')`,
      ),
    );
  return new Set(rows.map((r) => r.id));
}

/** Room for one more issued invoice this month on the workspace's plan. */
export async function invoicePlanCheck(tx: Tx, workspaceId: string, now = new Date()) {
  const ws = await workspaceOf(tx, workspaceId);
  return checkPlanLimit(tx, workspaceId, 'invoices_per_month', 1, {
    used: await issuedThisMonth(tx, workspaceId, ws.timeZone, now),
  });
}

// ---- Invoice emails (service role, one workspace at a time) ----

/** The client's primary contact, who gets the invoice and its reminders. */
async function primaryContact(tx: Tx, clientId: string) {
  const [c] = await tx
    .select({ name: clientContacts.name, email: clientContacts.email })
    .from(clientContacts)
    .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.isPrimary, true)));
  return c ?? null;
}

/** "Invoice [number] from [workspace]" to the client's primary contact, once per invoice. */
export async function queueInvoiceSent(tx: Tx, invoiceId: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv?.number || inv.status === 'draft' || inv.status === 'cancelled') return 0;
  const contact = await primaryContact(tx, inv.clientId);
  if (!contact?.email) return 0;
  return queueEmails(tx, inv.workspaceId, [
    {
      kind: 'invoice.sent',
      toEmail: contact.email,
      audience: 'client',
      payload: { invoiceId: inv.id },
      dedupeKey: `invoice.sent:${inv.id}`,
    },
  ]);
}

/** Today's reminders for a workspace, into the outbox (the email job marks them sent). */
export async function queueRemindersDue(db: Db, workspaceId: string, now = new Date()) {
  const due = await remindersDue(db, workspaceId, now);
  return withService(db, workspaceId, (tx, ws) =>
    queueEmails(
      tx,
      ws,
      due.map((d) => ({
        kind: 'invoice.reminder',
        toEmail: d.email,
        audience: 'client' as const,
        payload: { invoiceId: d.invoiceId, reminder: { kind: d.reminder.kind, on: d.reminder.on } },
        dedupeKey: `invoice.reminder:${d.invoiceId}:${d.reminder.on}`,
      })),
    ),
  );
}

/**
 * What an invoice email says, read when it's sent so the amount due is current. Null when
 * there's nothing to send any more (cancelled, or paid for a reminder).
 */
export async function invoiceEmailFacts(tx: Tx, invoiceId: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv?.number || inv.status === 'draft' || inv.status === 'cancelled') return null;
  const ws = await workspaceOf(tx, inv.workspaceId);
  const contact = await primaryContact(tx, inv.clientId);
  return {
    id: inv.id,
    linkVersion: inv.linkVersion,
    number: inv.number,
    status: inv.status,
    currency: inv.currency,
    totalMinor: inv.totalMinor,
    dueMinor: inv.totalMinor - inv.amountPaidMinor,
    dueOn: inv.dueOn,
    contactName: contact?.name ?? null,
    agency: { name: ws.name, brandColor: ws.brandColor },
  };
}

/**
 * Tells owners and finance about invoices that went overdue in the last week, once each (in
 * the app, and by email by their settings). The daily job runs it; a missed day catches up.
 */
export async function notifyOverdue(db: Db, workspaceId: string, now = new Date()) {
  return withService(db, workspaceId, async (tx, ws) => {
    const w = await workspaceOf(tx, ws);
    const today = localDate(now, w.timeZone);
    const late = await tx
      .select({ invoice: invoices, client: clients.name })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(
        and(
          eq(invoices.workspaceId, ws),
          sql`${invoices.status} in ('issued', 'partially_paid')`,
          isNull(invoices.deletedAt),
          lt(invoices.dueOn, today),
          sql`${invoices.dueOn} >= ${today}::date - 7`,
          sql`not exists (select 1 from notifications n where n.workspace_id = ${ws}
            and n.kind = 'invoice.overdue' and n.payload->>'invoiceId' = ${invoices.id}::text)`,
        ),
      );
    if (!late.length) return 0;
    const people = await tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.workspaceId, ws),
          sql`${memberships.role} in ('owner', 'finance')`,
          eq(memberships.status, 'active'),
        ),
      );
    for (const { invoice: inv, client } of late) {
      const event = {
        kind: 'invoice.overdue' as const,
        key: inv.id,
        workspaceId: ws,
        userIds: people.map((p) => p.userId),
        contactEmails: [],
        payload: {
          invoiceId: inv.id,
          number: inv.number,
          client,
          amountMinor: (inv.totalMinor - inv.amountPaidMinor).toString(),
          currency: inv.currency,
          dueOn: inv.dueOn,
        },
      };
      const sent = await notify(tx, event);
      await queueEventEmails(tx, event, sent.email);
    }
    return late.length;
  });
}
