import {
  calculateQuote,
  financialYear,
  formatDate,
  formatQuoteNumber,
  PROPOSAL_VALIDITY_DAYS,
  standardProposal,
  zonedTime,
  type InvoiceTotals,
  type PlaceOfSupply,
  type ProposalBlock,
} from '@agency-os/core';
import { and, asc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import { withService, type Db, type Tx } from './client';
import { logActivity } from './leads';
import { checkPlanLimit, notify } from './platform';
import {
  activities,
  auditLog,
  clients,
  leads,
  memberships,
  profiles,
  proposals,
  quoteItems,
  quotes,
  signatures,
  signingCodes,
  workspaces,
} from './schema';
import { hashCode, hashToken, newCode, newToken, sha256Json } from './tokens';

export type Quote = typeof quotes.$inferSelect;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;

export type QuoteItemInput = {
  description: string;
  sacCode?: string | null;
  quantity: string | number;
  rateMinor: bigint;
  discountMinor?: bigint;
  taxRateBp: number;
};

export type QuoteOptions = {
  currency?: string;
  /** An Indian state code, or null for a client abroad. */
  placeOfSupplyCode?: string | null;
  exportCountry?: string | null;
  hasLut?: boolean;
  roundOff?: boolean;
  discountMinor?: bigint;
};

const DAY = 86_400_000;
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

async function workspaceTax(tx: Tx, workspaceId: string) {
  const [ws] = await tx.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!ws) throw new AccountError('no_access');
  return ws;
}

function lutValidOn(ws: typeof workspaces.$inferSelect, on: Date) {
  const day = dateOnly(on);
  return Boolean(
    ws.lutArn && ws.lutValidFrom && ws.lutValidTo && ws.lutValidFrom <= day && day <= ws.lutValidTo,
  );
}

function placeOf(q: Pick<Quote, 'placeOfSupplyCode' | 'exportCountry'>): PlaceOfSupply {
  return q.placeOfSupplyCode
    ? { kind: 'india', stateCode: q.placeOfSupplyCode }
    : { kind: 'export', country: q.exportCountry ?? 'ZZ' };
}

function totalsFor(
  q: Pick<
    Quote,
    | 'currency'
    | 'supplierStateCode'
    | 'placeOfSupplyCode'
    | 'exportCountry'
    | 'hasLut'
    | 'roundOff'
    | 'discountMinor'
  >,
  items: QuoteItemInput[],
): InvoiceTotals {
  return calculateQuote({
    currency: q.currency,
    supplierStateCode: q.supplierStateCode ?? undefined,
    placeOfSupply: placeOf(q),
    hasValidLut: q.hasLut,
    roundOff: q.roundOff,
    discountMinor: q.discountMinor,
    lines: items.map((i) => ({
      description: i.description,
      sac: i.sacCode ?? undefined,
      quantity: i.quantity,
      rateMinor: i.rateMinor,
      discountMinor: i.discountMinor,
      taxRateBp: i.taxRateBp,
    })),
  });
}

async function writeTotals(tx: Tx, quote: Quote, items: QuoteItemInput[]) {
  if (items.length === 0) throw new AccountError('quote_items_required');
  let totals: InvoiceTotals;
  try {
    totals = totalsFor(quote, items);
  } catch (error) {
    throw new AccountError('quote_invalid', (error as Error).message);
  }
  await call(() => tx.delete(quoteItems).where(eq(quoteItems.quoteId, quote.id)));
  await call(() =>
    tx.insert(quoteItems).values(
      totals.lines.map((l, i) => ({
        workspaceId: quote.workspaceId,
        quoteId: quote.id,
        position: i,
        description: l.description.trim(),
        sacCode: l.sac ?? null,
        quantity: String(l.quantity),
        rateMinor: l.rateMinor,
        discountMinor: items[i]!.discountMinor ?? 0n,
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
      .update(quotes)
      .set({
        subtotalMinor: totals.subtotal.amountMinor,
        cgstMinor: totals.cgst.amountMinor,
        sgstMinor: totals.sgst.amountMinor,
        igstMinor: totals.igst.amountMinor,
        roundOffMinor: totals.roundOff.amountMinor,
        totalMinor: totals.total.amountMinor,
      })
      .where(eq(quotes.id, quote.id)),
  );
  return totals;
}

/**
 * A quote for a lead or a client, numbered OSS/Q26-27/001. Currency and place of supply come
 * from the client (or the lead and the workspace); GST comes from packages/core.
 */
export async function createQuote(
  tx: Tx,
  workspaceId: string,
  input: QuoteOptions & {
    leadId?: string;
    clientId?: string;
    title?: string;
    items: QuoteItemInput[];
  },
  actorId: string,
  now = new Date(),
): Promise<string> {
  const ws = await workspaceTax(tx, workspaceId);
  let currency = input.currency;
  let place: { code: string | null; country: string | null } = {
    code: ws.stateCode,
    country: null,
  };
  if (input.clientId) {
    const [c] = await tx.select().from(clients).where(eq(clients.id, input.clientId));
    if (!c) throw new AccountError('client_not_found');
    currency ??= c.currency;
    place =
      c.country === 'IN'
        ? { code: c.stateCode ?? ws.stateCode, country: null }
        : { code: null, country: c.country };
  } else if (input.leadId) {
    const [l] = await tx.select().from(leads).where(eq(leads.id, input.leadId));
    if (!l) throw new AccountError('lead_not_found');
    currency ??= l.currency;
    // A lead has no address yet: a quote in another currency is treated as an export.
    if (currency !== 'INR') place = { code: null, country: null };
  } else throw new AccountError('quote_for_required');
  currency = (currency ?? ws.baseCurrency).toUpperCase();
  if (input.placeOfSupplyCode !== undefined)
    place = { code: input.placeOfSupplyCode, country: input.exportCountry ?? null };

  const fy = financialYear(now, ws.timeZone);
  const [seq] = await call(() =>
    tx.execute<{ n: number }>(
      sql`select take_document_number(${workspaceId}::uuid, 'quote', ${fy}) as n`,
    ),
  );
  const id = uuidv7();
  const [quote] = await call(() =>
    tx
      .insert(quotes)
      .values({
        id,
        workspaceId,
        leadId: input.leadId ?? null,
        clientId: input.clientId ?? null,
        number: formatQuoteNumber(ws.invoicePrefix, now, seq!.n),
        financialYear: fy,
        title: input.title ?? null,
        currency,
        supplierStateCode: ws.gstin ? ws.stateCode : null,
        placeOfSupplyCode: place.code,
        exportCountry: place.code ? null : (input.exportCountry ?? place.country),
        hasLut: input.hasLut ?? lutValidOn(ws, now),
        roundOff: input.roundOff ?? false,
        discountMinor: input.discountMinor ?? 0n,
        validUntil: dateOnly(new Date(now.getTime() + PROPOSAL_VALIDITY_DAYS * DAY)),
        createdBy: actorId,
      })
      .returning(),
  );
  await writeTotals(tx, quote!, input.items);
  if (input.leadId)
    await logActivity(tx, {
      workspaceId,
      leadId: input.leadId,
      kind: 'quote_created',
      actorId,
      meta: { quoteId: id, number: quote!.number },
    });
  return id;
}

/** Replaces a draft quote's items and options and recalculates. */
export async function updateQuote(
  tx: Tx,
  quoteId: string,
  input: QuoteOptions & { title?: string; items: QuoteItemInput[] },
) {
  const [current] = await tx.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!current) throw new AccountError('quote_not_found');
  if (current.status !== 'draft') throw new AccountError('quote_locked');
  const [quote] = await call(() =>
    tx
      .update(quotes)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.currency ? { currency: input.currency.toUpperCase() } : {}),
        ...(input.placeOfSupplyCode !== undefined
          ? {
              placeOfSupplyCode: input.placeOfSupplyCode,
              exportCountry: input.placeOfSupplyCode ? null : (input.exportCountry ?? null),
            }
          : {}),
        ...(input.hasLut !== undefined ? { hasLut: input.hasLut } : {}),
        ...(input.roundOff !== undefined ? { roundOff: input.roundOff } : {}),
        ...(input.discountMinor !== undefined ? { discountMinor: input.discountMinor } : {}),
      })
      .where(eq(quotes.id, quoteId))
      .returning(),
  );
  return writeTotals(tx, quote!, input.items);
}

export async function getQuote(tx: Tx, quoteId: string) {
  const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) return null;
  const items = await tx
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId))
    .orderBy(asc(quoteItems.position));
  return { ...quote, items };
}

export async function listQuotes(
  tx: Tx,
  workspaceId: string,
  filter: { leadId?: string; clientId?: string } = {},
) {
  return tx
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.workspaceId, workspaceId),
        isNull(quotes.deletedAt),
        filter.leadId ? eq(quotes.leadId, filter.leadId) : undefined,
        filter.clientId ? eq(quotes.clientId, filter.clientId) : undefined,
      ),
    )
    .orderBy(sql`${quotes.createdAt} desc`);
}

/** The start of this calendar month in the workspace's time zone. */
async function monthStart(tx: Tx, workspaceId: string, now: Date) {
  const ws = await workspaceTax(tx, workspaceId);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ws.timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  return zonedTime({ year, month, day: 1 }, ws.timeZone);
}

/** Documents sent this month, for the Free plan's monthly limits. */
export async function sentThisMonth(
  tx: Tx,
  workspaceId: string,
  kind: 'quote' | 'proposal',
  now = new Date(),
) {
  const from = await monthStart(tx, workspaceId, now);
  const table = kind === 'quote' ? quotes : proposals;
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(table)
    .where(and(eq(table.workspaceId, workspaceId), gte(table.sentAt, from)));
  return row?.n ?? 0;
}

async function checkMonthly(tx: Tx, workspaceId: string, kind: 'quote' | 'proposal', now: Date) {
  const check = await checkPlanLimit(
    tx,
    workspaceId,
    kind === 'quote' ? 'quotes_per_month' : 'proposals_per_month',
    1,
    {
      used: await sentThisMonth(tx, workspaceId, kind, now),
    },
  );
  if (!check.allowed) throw new AccountError('plan_limit', check.message);
}

/** Marks a quote sent (it's then fixed). Counts towards the plan's quotes a month. */
export async function sendQuote(tx: Tx, quoteId: string, actorId: string, now = new Date()) {
  const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) throw new AccountError('quote_not_found');
  if (quote.status !== 'draft') throw new AccountError('quote_locked');
  await checkMonthly(tx, quote.workspaceId, 'quote', now);
  await tx.update(quotes).set({ status: 'sent', sentAt: now }).where(eq(quotes.id, quoteId));
  if (quote.leadId)
    await logActivity(tx, {
      workspaceId: quote.workspaceId,
      leadId: quote.leadId,
      kind: 'quote_sent',
      actorId,
      meta: { quoteId, number: quote.number },
    });
}

// ---- Proposals ----

export async function createProposal(
  tx: Tx,
  workspaceId: string,
  input: { leadId?: string; clientId?: string; quoteId?: string; title?: string },
  actorId: string,
  now = new Date(),
): Promise<string> {
  const ws = await workspaceTax(tx, workspaceId);
  let clientName: string | undefined;
  let leadId = input.leadId ?? null;
  let clientId = input.clientId ?? null;
  const quote = input.quoteId ? await getQuote(tx, input.quoteId) : null;
  if (input.quoteId && !quote) throw new AccountError('quote_not_found');
  leadId ??= quote?.leadId ?? null;
  clientId ??= quote?.clientId ?? null;
  if (clientId) {
    const [c] = await tx
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, clientId));
    clientName = c?.name;
  } else if (leadId) {
    const [l] = await tx
      .select({ name: leads.name, company: leads.company })
      .from(leads)
      .where(eq(leads.id, leadId));
    clientName = l?.company ?? l?.name;
  }
  if (!clientName) throw new AccountError('quote_for_required');
  const [me] = await tx
    .select({ name: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, actorId));
  const blocks = standardProposal({
    clientName,
    date: formatDate(now, { locale: ws.locale, timeZone: ws.timeZone }),
    preparedBy: me?.name ?? ws.name,
    quoteId: quote?.id ?? null,
    scope: quote?.items.map((i) => i.description) ?? [],
  });
  const id = uuidv7();
  await call(() =>
    tx.insert(proposals).values({
      id,
      workspaceId,
      leadId,
      clientId,
      quoteId: quote?.id ?? null,
      title: input.title ?? `Proposal for ${clientName}`,
      blocks,
      createdBy: actorId,
    }),
  );
  if (leadId)
    await logActivity(tx, {
      workspaceId,
      leadId,
      kind: 'proposal_created',
      actorId,
      meta: { proposalId: id },
    });
  return id;
}

export async function updateProposal(
  tx: Tx,
  proposalId: string,
  patch: { title?: string; blocks?: ProposalBlock[] },
) {
  const rows = await call(() =>
    tx
      .update(proposals)
      .set(patch)
      .where(eq(proposals.id, proposalId))
      .returning({ id: proposals.id }),
  );
  if (rows.length === 0) throw new AccountError('proposal_not_found');
}

/** What the client sees and signs: the blocks and the quote as numbers, never internal notes. */
async function snapshot(tx: Tx, proposal: Proposal) {
  const quote = proposal.quoteId ? await getQuote(tx, proposal.quoteId) : null;
  return {
    title: proposal.title,
    blocks: proposal.blocks as ProposalBlock[],
    quote: quote && {
      number: quote.number,
      currency: quote.currency,
      items: quote.items.map((i) => ({
        description: i.description,
        sacCode: i.sacCode,
        quantity: i.quantity,
        rateMinor: i.rateMinor,
        taxableMinor: i.taxableMinor,
        taxRateBp: i.taxRateBp,
        amountMinor: i.amountMinor,
      })),
      discountMinor: quote.discountMinor,
      subtotalMinor: quote.subtotalMinor,
      cgstMinor: quote.cgstMinor,
      sgstMinor: quote.sgstMinor,
      igstMinor: quote.igstMinor,
      roundOffMinor: quote.roundOffMinor,
      totalMinor: quote.totalMinor,
      validUntil: quote.validUntil,
    },
  };
}

/**
 * Sends a proposal: fixes its content (and its quote), records the hash of what was sent,
 * makes the public link (valid 14 days) and returns its token. Counts towards proposals a month.
 */
export async function sendProposal(tx: Tx, proposalId: string, actorId: string, now = new Date()) {
  const [proposal] = await tx
    .select()
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), isNull(proposals.deletedAt)));
  if (!proposal) throw new AccountError('proposal_not_found');
  if (proposal.status !== 'draft') throw new AccountError('proposal_locked');
  await checkMonthly(tx, proposal.workspaceId, 'proposal', now);
  if (proposal.quoteId)
    await tx
      .update(quotes)
      .set({ status: 'sent', sentAt: now })
      .where(and(eq(quotes.id, proposal.quoteId), eq(quotes.status, 'draft')));
  const { token, hash } = newToken();
  await tx
    .update(proposals)
    .set({
      status: 'sent',
      publicTokenHash: hash,
      documentSha256: sha256Json(await snapshot(tx, proposal)),
      sentAt: now,
      sentBy: actorId,
      expiresAt: new Date(now.getTime() + PROPOSAL_VALIDITY_DAYS * DAY),
    })
    .where(eq(proposals.id, proposalId));
  if (proposal.leadId)
    await logActivity(tx, {
      workspaceId: proposal.workspaceId,
      leadId: proposal.leadId,
      kind: 'proposal_sent',
      actorId,
      meta: { proposalId },
    });
  return { token };
}

// ---- The public proposal page (no sign-in) ----

export type ClientRequest = { ip?: string | null; userAgent?: string | null };

async function linkWorkspace(db: Db, token: string) {
  const workspaceId = await db.transaction(async (tx) => {
    await tx.execute(sql`set local role anon`);
    const [row] = await tx.execute<{ ws: string | null }>(
      sql`select proposal_link_workspace(${hashToken(token)}) as ws`,
    );
    return row?.ws ?? null;
  });
  if (!workspaceId) throw new AccountError('proposal_link_invalid');
  return workspaceId;
}

/** Runs fn as the service role for the link's workspace, with the proposal locked for update. */
async function withLink<T>(
  db: Db,
  token: string,
  now: Date,
  fn: (tx: Tx, p: Proposal) => Promise<T>,
) {
  const workspaceId = await linkWorkspace(db, token);
  return withService(db, workspaceId, async (tx, ws) => {
    const [p] = await tx
      .select()
      .from(proposals)
      .where(and(eq(proposals.workspaceId, ws), eq(proposals.publicTokenHash, hashToken(token))))
      .for('update');
    if (!p) throw new AccountError('proposal_link_invalid');
    if ((p.status === 'sent' || p.status === 'viewed') && p.expiresAt && p.expiresAt < now) {
      await tx.update(proposals).set({ status: 'expired' }).where(eq(proposals.id, p.id));
      p.status = 'expired';
    }
    return fn(tx, p);
  });
}

async function owners(tx: Tx, workspaceId: string) {
  const rows = await tx
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.role, 'owner'),
        eq(memberships.status, 'active'),
      ),
    );
  return rows.map((r) => r.userId);
}

/** Opens the proposal for the client and records the view (the first one tells the sender). */
export async function viewProposal(
  db: Db,
  token: string,
  request: ClientRequest = {},
  now = new Date(),
) {
  return withLink(db, token, now, async (tx, p) => {
    if (p.status === 'sent' || p.status === 'viewed') {
      await tx
        .update(proposals)
        .set({
          status: 'viewed',
          viewCount: sql`${proposals.viewCount} + 1`,
          lastViewedAt: now,
          firstViewedAt: p.firstViewedAt ?? now,
        })
        .where(eq(proposals.id, p.id));
      await tx.insert(activities).values({
        workspaceId: p.workspaceId,
        subjectType: 'proposal',
        subjectId: p.id,
        kind: 'proposal_viewed',
        meta: { ip: request.ip ?? null, userAgent: request.userAgent ?? null },
      });
      if (!p.firstViewedAt && p.sentBy) {
        const name = await clientNameOf(tx, p);
        await notify(tx, {
          workspaceId: p.workspaceId,
          userIds: [p.sentBy],
          kind: 'proposal.viewed',
          payload: { proposalId: p.id, client: name },
        });
      }
    }
    const [ws] = await tx
      .select({
        name: workspaces.name,
        logoPath: workspaces.logoPath,
        brandColor: workspaces.brandColor,
        plan: workspaces.plan,
      })
      .from(workspaces)
      .where(eq(workspaces.id, p.workspaceId));
    return { status: p.status, expiresAt: p.expiresAt, workspace: ws!, ...(await snapshot(tx, p)) };
  });
}

async function clientNameOf(tx: Tx, p: Proposal) {
  if (p.clientId)
    return (
      (await tx.select({ n: clients.name }).from(clients).where(eq(clients.id, p.clientId)))[0]
        ?.n ?? null
    );
  if (p.leadId) {
    const [l] = await tx
      .select({ n: leads.name, c: leads.company })
      .from(leads)
      .where(eq(leads.id, p.leadId));
    return l?.c ?? l?.n ?? null;
  }
  return null;
}

const CODE_TTL_MS = 10 * 60_000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function open(p: Proposal) {
  if (p.status === 'signed') throw new AccountError('proposal_signed');
  if (p.status === 'declined') throw new AccountError('proposal_declined');
  if (p.status === 'expired') throw new AccountError('proposal_expired');
}

/**
 * Starts signing: makes a one-time code for the signer's email. The caller emails it (it is
 * never stored in plain text). At most 5 codes an hour per proposal.
 */
export async function requestSigningCode(db: Db, token: string, email: string, now = new Date()) {
  const destination = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination))
    throw new AccountError('signer_email_invalid');
  return withLink(db, token, now, async (tx, p) => {
    open(p);
    const [recent] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(signingCodes)
      .where(
        and(
          eq(signingCodes.proposalId, p.id),
          gte(signingCodes.createdAt, new Date(now.getTime() - 3_600_000)),
        ),
      );
    if ((recent?.n ?? 0) >= MAX_CODES_PER_HOUR) throw new AccountError('signing_code_limit');
    const code = newCode();
    const id = uuidv7();
    await tx.insert(signingCodes).values({
      id,
      workspaceId: p.workspaceId,
      proposalId: p.id,
      channel: 'email_otp',
      destination,
      codeHash: hashCode(code, id),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      createdAt: now,
    });
    return { code, email: destination };
  });
}

export type Signing = {
  name: string;
  email: string;
  code: string;
  signatureImagePath?: string | null;
} & ClientRequest;

/**
 * Signs the proposal after checking the code: writes the evidence (name, verified email,
 * time, IP, user agent and the hash of what was signed), accepts the quote, and tells the
 * sender and the owners.
 */
export async function signProposal(db: Db, token: string, signing: Signing, now = new Date()) {
  const name = signing.name.trim();
  if (!name) throw new AccountError('signer_name_required');
  const email = signing.email.trim().toLowerCase();
  return withLink(db, token, now, async (tx, p) => {
    open(p);
    const [code] = await tx
      .select()
      .from(signingCodes)
      .where(
        and(
          eq(signingCodes.proposalId, p.id),
          eq(signingCodes.destination, email),
          isNull(signingCodes.usedAt),
        ),
      )
      .orderBy(sql`${signingCodes.createdAt} desc`)
      .limit(1);
    if (!code || code.expiresAt < now) throw new AccountError('signing_code_expired');
    if (code.attempts >= MAX_ATTEMPTS) throw new AccountError('signing_code_limit');
    if (code.codeHash !== hashCode(signing.code.trim(), code.id)) {
      await tx
        .update(signingCodes)
        .set({ attempts: code.attempts + 1 })
        .where(eq(signingCodes.id, code.id));
      return { signed: false as const, error: new AccountError('signing_code_wrong') };
    }
    const current = sha256Json(await snapshot(tx, p));
    if (current !== p.documentSha256) throw new AccountError('proposal_changed');
    await tx.update(signingCodes).set({ usedAt: now }).where(eq(signingCodes.id, code.id));
    await tx.insert(signatures).values({
      workspaceId: p.workspaceId,
      proposalId: p.id,
      signerName: name,
      signerEmail: email,
      verifiedVia: 'email_otp',
      signatureImagePath: signing.signatureImagePath ?? null,
      ip: signing.ip ?? null,
      userAgent: signing.userAgent ?? null,
      signedAt: now,
      documentSha256: current,
    });
    await tx
      .update(proposals)
      .set({ status: 'signed', decidedAt: now })
      .where(eq(proposals.id, p.id));
    if (p.quoteId)
      await tx.update(quotes).set({ status: 'accepted' }).where(eq(quotes.id, p.quoteId));
    await decided(tx, p, 'proposal_signed', { signer: name, email });
    return { signed: true as const };
  }).then((result) => {
    // A wrong code is counted (committed) before it is reported.
    if (!result.signed) throw result.error;
  });
}

async function decided(
  tx: Tx,
  p: Proposal,
  kind: 'proposal_signed' | 'proposal_declined',
  meta: Record<string, unknown>,
) {
  if (p.leadId)
    await logActivity(tx, {
      workspaceId: p.workspaceId,
      leadId: p.leadId,
      kind,
      actorId: null,
      meta: { proposalId: p.id, ...meta },
    });
  await tx.insert(auditLog).values({
    workspaceId: p.workspaceId,
    actorId: null,
    action: kind.replace('_', '.'),
    subjectType: 'proposal',
    subjectId: p.id,
    changes: meta,
  });
  const recipients = [
    ...new Set([...(p.sentBy ? [p.sentBy] : []), ...(await owners(tx, p.workspaceId))]),
  ];
  await notify(tx, {
    workspaceId: p.workspaceId,
    userIds: recipients,
    kind: 'proposal.decided',
    payload: {
      proposalId: p.id,
      client: await clientNameOf(tx, p),
      outcome: kind === 'proposal_signed' ? 'signed' : 'declined',
    },
  });
}

export async function declineProposal(
  db: Db,
  token: string,
  reason: string | null,
  now = new Date(),
) {
  return withLink(db, token, now, async (tx, p) => {
    open(p);
    await tx
      .update(proposals)
      .set({ status: 'declined', decidedAt: now, declineReason: reason?.trim() || null })
      .where(eq(proposals.id, p.id));
    if (p.quoteId)
      await tx.update(quotes).set({ status: 'declined' }).where(eq(quotes.id, p.quoteId));
    await decided(tx, p, 'proposal_declined', { reason: reason ?? null });
  });
}

/** Daily job (per workspace, as the service role): sent proposals past their date expire. */
export async function expireProposals(tx: Tx, workspaceId: string, now = new Date()) {
  const rows = await tx
    .update(proposals)
    .set({ status: 'expired' })
    .where(
      and(
        eq(proposals.workspaceId, workspaceId),
        inArray(proposals.status, ['sent', 'viewed']),
        lt(proposals.expiresAt, now),
      ),
    )
    .returning({ id: proposals.id });
  return rows.length;
}

export async function proposalSignature(tx: Tx, proposalId: string) {
  const [row] = await tx.select().from(signatures).where(eq(signatures.proposalId, proposalId));
  return row ?? null;
}
