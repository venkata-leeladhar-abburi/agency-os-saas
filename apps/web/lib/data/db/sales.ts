// Server only. Quotes and proposals on the database, in the shapes the screens use (see
// ../sales.ts for the example-mode versions). Agency pages run as the member, with RLS; the
// public proposal link runs as the service role for that one proposal (packages/db).
import { formatDate, formatMoney, PROPOSAL_VALIDITY_DAYS } from '@agency-os/core';
import {
  AccountError,
  askAboutProposal,
  createProposal as dbCreateProposal,
  createQuote as dbCreateQuote,
  declineProposal as dbDeclineProposal,
  getClient,
  getLead,
  getProposal as dbGetProposal,
  getQuote as dbGetQuote,
  listClients,
  listLeads,
  listProposals,
  listQuotes,
  listStages,
  moveLead,
  nextQuoteNumber,
  proposalByLink,
  proposalLinkToken,
  proposalQuestions,
  proposalSignature,
  requestSigningCode,
  sendProposal as dbSendProposal,
  signProposal,
  totalsOfQuote,
  updateProposal,
  viewProposal,
  workspaceSettings,
  type ClientRequest,
  type Db,
  type Proposal as DbProposal,
  type Tx,
} from '@agency-os/db';
import type { ProposalBlock } from '@agency-os/core';
import type { QuoteInput } from '../../forms';
import { database } from '../../server/db';
import { emailsQueued } from '../../server/jobs';
import { asMember, linkSecret, type WorkspaceCtx } from '../../server/workspace';
import type { Activity, Proposal, Quote } from '../types';
import {
  applyProposalText,
  istDate,
  proposalStatus,
  type ProposalText,
  type ProposalView,
} from '../views';
import { settingsFromDb } from './map';

type DbQuote = NonNullable<Awaited<ReturnType<typeof dbGetQuote>>>;
type DbSignature = NonNullable<Awaited<ReturnType<typeof proposalSignature>>>;

// ---------- Shapes ----------

function quoteFromDb(q: DbQuote, recipient: string): Quote {
  return {
    id: q.id,
    number: q.number,
    leadId: q.leadId,
    clientId: q.clientId,
    recipient,
    country: q.placeOfSupplyCode ? 'IN' : (q.exportCountry ?? 'ZZ'),
    stateCode: q.placeOfSupplyCode,
    currency: q.currency,
    validUntil: q.validUntil ?? istDate(q.createdAt.toISOString()),
    lines: q.items.map((i) => ({
      description: i.description,
      sac: i.sacCode ?? undefined,
      quantity: Number(i.quantity),
      rateMinor: i.rateMinor,
      discountMinor: i.discountMinor,
      taxRateBp: i.taxRateBp,
    })),
    discountMinor: q.discountMinor,
    createdAt: q.createdAt.toISOString(),
    example: q.isExample || undefined,
  };
}

const STATUS: Record<DbProposal['status'], Proposal['status']> = {
  draft: 'draft',
  sent: 'sent',
  viewed: 'viewed',
  signed: 'accepted',
  declined: 'declined',
  // Expired is worked out from the valid-until date (proposalStatus), as in example mode.
  expired: 'sent',
};

/** Its timeline from what the proposal row records: started, sent, viewed, decided. */
type Question = Awaited<ReturnType<typeof proposalQuestions>>[number];

function proposalTimeline(
  p: DbProposal,
  recipient: string,
  signer: string | null,
  questions: Question[] = [],
): Activity[] {
  const at = (d: Date | null) => d?.toISOString() ?? '';
  const items: Activity[] = [
    {
      id: `${p.id}-c`,
      kind: 'created',
      who: 'You',
      text: 'started the proposal',
      at: at(p.createdAt),
    },
  ];
  if (p.sentAt)
    items.push({
      id: `${p.id}-s`,
      kind: 'sent',
      who: 'You',
      text: p.sentTo ? `sent the proposal to ${p.sentTo}` : 'sent the proposal',
      at: at(p.sentAt),
    });
  if (p.firstViewedAt)
    items.push({
      id: `${p.id}-v`,
      kind: 'viewed',
      who: recipient,
      text: 'viewed the proposal',
      at: at(p.firstViewedAt),
    });
  if (p.status === 'signed' && p.decidedAt)
    items.push({
      id: `${p.id}-d`,
      kind: 'signed',
      who: signer ?? recipient,
      text: 'signed the proposal',
      at: at(p.decidedAt),
    });
  if (p.status === 'declined' && p.decidedAt)
    items.push({
      id: `${p.id}-d`,
      kind: 'declined',
      who: recipient,
      text: p.declineReason ? `declined: ${p.declineReason}` : 'declined the proposal',
      at: at(p.decidedAt),
    });
  for (const q of questions)
    items.push({
      id: q.id,
      kind: 'question',
      who: recipient,
      text: `asked: “${q.body ?? ''}”`,
      at: at(q.createdAt),
    });
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

function proposalFromDb(
  p: DbProposal,
  quote: Quote,
  signature: DbSignature | null,
  secret: string | null,
  questions: Question[] = [],
): Proposal {
  return {
    id: p.id,
    quoteId: quote.id,
    title: p.title,
    email: p.sentTo,
    status: STATUS[p.status],
    blocks: p.blocks as ProposalBlock[],
    // The public link exists once sent; it's made again from the secret, never stored.
    token: p.publicTokenHash && secret ? proposalLinkToken(secret, p.id) : '',
    views: p.viewCount,
    lastViewedAt: p.lastViewedAt?.toISOString() ?? null,
    sentAt: p.sentAt?.toISOString() ?? null,
    validUntil: p.expiresAt
      ? istDate(p.expiresAt.toISOString())
      : (quote.validUntil ??
        istDate(new Date(Date.now() + PROPOSAL_VALIDITY_DAYS * 86_400_000).toISOString())),
    signature: signature
      ? {
          name: signature.signerName,
          email: signature.signerEmail ?? '',
          at: signature.signedAt.toISOString(),
          ip: signature.ip ?? '',
          method: 'email_code',
          userAgent: signature.userAgent,
          documentHash: signature.documentSha256,
        }
      : null,
    declineReason: p.declineReason,
    pendingCode: null,
    activities: proposalTimeline(p, quote.recipient, signature?.signerName ?? null, questions),
    createdAt: p.createdAt.toISOString(),
    example: p.isExample || undefined,
  };
}

/** Who a quote is for, by name: the client, or the lead's company (or name). */
async function recipientOf(tx: Tx, q: { clientId: string | null; leadId: string | null }) {
  if (q.clientId) return (await getClient(tx, q.clientId))?.name ?? '';
  if (q.leadId) {
    const l = await getLead(tx, q.leadId);
    return l?.company ?? l?.name ?? '';
  }
  return '';
}

// ---------- The sales list ----------

export type SalesItem = {
  kind: 'Quote' | 'Proposal';
  id: string;
  quoteId: string | null;
  leadId: string | null;
  clientId: string | null;
  title: string;
  number: string;
  forName: string;
  amountMinor: bigint;
  currency: string;
  status: ProposalView | 'quote';
  views: number;
  updated: string;
};

/** Proposals, and quotes that have none, newest first. */
export async function salesItems(ctx: WorkspaceCtx, now = new Date()): Promise<SalesItem[]> {
  return asMember(ctx, async (tx) => {
    const [quotes, proposals, clients, leads] = await Promise.all([
      listQuotes(tx, ctx.workspaceId),
      listProposals(tx, ctx.workspaceId),
      listClients(tx, ctx.workspaceId, { limit: null }),
      listLeads(tx, ctx.workspaceId, { limit: null }),
    ]);
    const nameOf = (q: { clientId: string | null; leadId: string | null }) =>
      (q.clientId && clients.find((c) => c.id === q.clientId)?.name) ||
      (() => {
        const l = leads.find((r) => r.lead.id === q.leadId)?.lead;
        return l?.company ?? l?.name ?? '';
      })();
    const items: SalesItem[] = proposals.map((p) => {
      const q = quotes.find((x) => x.id === p.quoteId);
      const validUntil = p.expiresAt ? istDate(p.expiresAt.toISOString()) : '9999-12-31';
      return {
        kind: 'Proposal',
        id: p.id,
        quoteId: p.quoteId,
        leadId: p.leadId,
        clientId: p.clientId,
        title: p.title,
        number: q?.number ?? '',
        forName: nameOf(p),
        amountMinor: q?.totalMinor ?? 0n,
        currency: q?.currency ?? 'INR',
        status: proposalStatus({ status: STATUS[p.status], validUntil }, now),
        views: p.viewCount,
        updated: (p.sentAt ?? p.createdAt).toISOString(),
      };
    });
    for (const q of quotes)
      if (!proposals.some((p) => p.quoteId === q.id))
        items.push({
          kind: 'Quote',
          id: q.id,
          quoteId: q.id,
          leadId: q.leadId,
          clientId: q.clientId,
          title: `Quote for ${nameOf(q)}`,
          number: q.number,
          forName: nameOf(q),
          amountMinor: q.totalMinor,
          currency: q.currency,
          status: 'quote',
          views: 0,
          updated: q.createdAt.toISOString(),
        });
    return items;
  });
}

export const salesAmount = (i: SalesItem) => formatMoney(i.amountMinor, i.currency);
export const salesDate = (i: SalesItem) => formatDate(i.updated, { year: false });

// ---------- Quotes ----------

export async function quoteDetail(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, async (tx) => {
    const q = await dbGetQuote(tx, id);
    if (!q || q.workspaceId !== ctx.workspaceId || q.deletedAt) return null;
    const quote = quoteFromDb(q, await recipientOf(tx, q));
    const [p] = await listProposals(tx, ctx.workspaceId, { quoteId: id });
    const settings = settingsFromDb(await workspaceSettings(tx, ctx.workspaceId));
    const proposal = p
      ? proposalFromDb(p, quote, await proposalSignature(tx, p.id), safeSecret())
      : null;
    return { quote, totals: totalsOfQuote(q, q.items), proposal, settings };
  });
}

/** Every quote with the totals it was saved with, for the CSV export. */
export async function quotesWithTotals(ctx: WorkspaceCtx) {
  return asMember(ctx, async (tx) => {
    const rows = await listQuotes(tx, ctx.workspaceId);
    const out: { quote: Quote; totals: ReturnType<typeof totalsOfQuote> }[] = [];
    for (const row of rows) {
      const q = await dbGetQuote(tx, row.id);
      if (q)
        out.push({
          quote: quoteFromDb(q, await recipientOf(tx, q)),
          totals: totalsOfQuote(q, q.items),
        });
    }
    return out;
  });
}

/** Who a quote can be for: open leads and every client. */
export async function recipients(ctx: WorkspaceCtx) {
  return asMember(ctx, async (tx) => {
    const [stages, leads, clients] = await Promise.all([
      listStages(tx, ctx.workspaceId),
      listLeads(tx, ctx.workspaceId, { limit: null }),
      listClients(tx, ctx.workspaceId, { limit: null }),
    ]);
    const open = new Set(stages.filter((s) => s.kind === 'open').map((s) => s.id));
    return {
      leads: leads
        .filter((r) => open.has(r.lead.stageId))
        .map((r) => ({ id: r.lead.id, name: r.lead.company ?? r.lead.name })),
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country,
        stateCode: c.stateCode,
      })),
    };
  });
}

export async function nextNumber(ctx: WorkspaceCtx, now = new Date()) {
  return asMember(ctx, (tx) => nextQuoteNumber(tx, ctx.workspaceId, now));
}

export async function createQuoteFor(ctx: WorkspaceCtx, input: QuoteInput): Promise<string> {
  return asMember(ctx, (tx) =>
    dbCreateQuote(
      tx,
      ctx.workspaceId,
      {
        leadId: input.leadId ?? undefined,
        clientId: input.clientId ?? undefined,
        currency: input.currency,
        placeOfSupplyCode: input.country === 'IN' ? input.stateCode : null,
        exportCountry: input.country === 'IN' ? null : input.country,
        discountMinor: input.discountMinor,
        validUntil: input.validUntil,
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
    ),
  );
}

// ---------- Proposals ----------

/** The secret for proposal links, or null when it isn't set (drafts still show). */
function safeSecret(): string | null {
  try {
    return linkSecret();
  } catch {
    return null;
  }
}

/** The quote's proposal, made from the standard template the first time. */
export async function createProposalFor(ctx: WorkspaceCtx, quoteId: string) {
  return asMember(ctx, async (tx) => {
    const [existing] = await listProposals(tx, ctx.workspaceId, { quoteId });
    if (existing) return existing.id;
    return dbCreateProposal(tx, ctx.workspaceId, { quoteId }, ctx.session.userId);
  });
}

export async function proposalDetail(ctx: WorkspaceCtx, id: string, now = new Date()) {
  return asMember(ctx, async (tx) => {
    const p = await dbGetProposal(tx, id);
    if (!p || p.workspaceId !== ctx.workspaceId || !p.quoteId) return null;
    const q = await dbGetQuote(tx, p.quoteId);
    if (!q) return null;
    const quote = quoteFromDb(q, await recipientOf(tx, p));
    const proposal = proposalFromDb(
      p,
      quote,
      await proposalSignature(tx, p.id),
      safeSecret(),
      await proposalQuestions(tx, p.id),
    );
    return {
      proposal,
      quote,
      totals: totalsOfQuote(q, q.items),
      status: proposalStatus(proposal, now),
      settings: settingsFromDb(await workspaceSettings(tx, ctx.workspaceId)),
      // What was sent is fixed, so the hash recorded at sending is the current one.
      hash: p.documentSha256 ?? '',
    };
  });
}

export async function saveProposalTextFor(ctx: WorkspaceCtx, id: string, text: ProposalText) {
  return asMember(ctx, async (tx) => {
    const p = await dbGetProposal(tx, id);
    if (!p || p.workspaceId !== ctx.workspaceId) throw new AccountError('proposal_not_found');
    if (p.status !== 'draft') throw new AccountError('proposal_locked');
    await updateProposal(tx, id, { blocks: applyProposalText(p.blocks as ProposalBlock[], text) });
  });
}

/**
 * Sends: fixes the proposal, makes its link and keeps the address for the signing code. A lead
 * still in New or Contacted moves to Proposal, as in example mode. The email itself waits for
 * Resend; the agency copies the link or shares it on WhatsApp meanwhile.
 */
export async function sendProposalFor(ctx: WorkspaceCtx, id: string, email: string) {
  return asMember(ctx, async (tx) => {
    const p = await dbGetProposal(tx, id);
    if (!p || p.workspaceId !== ctx.workspaceId) throw new AccountError('proposal_not_found');
    await dbSendProposal(tx, id, ctx.session.userId, new Date(), { secret: linkSecret(), email });
    if (!p.leadId) return;
    const [lead, stages] = await Promise.all([
      getLead(tx, p.leadId),
      listStages(tx, ctx.workspaceId),
    ]);
    const open = stages.filter((s) => s.kind === 'open');
    const at = open.findIndex((s) => s.id === lead?.stageId);
    const target = open[Math.min(2, open.length - 1)];
    if (lead && target && at !== -1 && at < open.indexOf(target))
      await moveLead(tx, { leadId: lead.id, stageId: target.id, actorId: ctx.session.userId });
  });
}

// ---------- The public link ----------

function publicDb(): Db {
  const db = database();
  if (!db) throw new Error('DATABASE_URL is not set');
  return db;
}

/** The proposal behind a public link, in the screens' shape; counts a view unless previewing. */
export async function proposalForLink(
  token: string,
  countView: boolean,
  request: ClientRequest = {},
  now = new Date(),
) {
  const db = publicDb();
  try {
    if (countView) await viewProposal(db, token, request, now);
    const found = await proposalByLink(db, token, now);
    if (!found.quote || found.proposal.status === 'draft') return null;
    const quote = quoteFromDb(found.quote, found.clientName ?? '');
    const proposal = proposalFromDb(found.proposal, quote, found.signature, safeSecret());
    const ws = found.workspace;
    return {
      proposal,
      quote,
      totals: totalsOfQuote(found.quote, found.quote.items),
      status: found.proposal.status === 'expired' ? 'expired' : proposalStatus(proposal, now),
      workspace: ws.name,
      settings: settingsFromDb(found.settings),
      // Logos wait for Storage; the brand colour works now.
      brand: { name: ws.name, logoUrl: null, colour: ws.brandColor, plan: ws.plan },
      hash: found.proposal.documentSha256 ?? '',
    } as const;
  } catch (error) {
    if (error instanceof AccountError && error.code === 'proposal_link_invalid') return null;
    throw error;
  }
}

/** Step one of signing: a code to the address the proposal was sent to. */
export async function signingCodeFor(token: string, now = new Date()) {
  const found = await proposalByLink(publicDb(), token, now);
  if (!found.proposal.sentTo) throw new AccountError('signer_email_invalid');
  const { code, email } = await requestSigningCode(publicDb(), token, found.proposal.sentTo, now);
  return { code, email, title: found.proposal.title, agency: found.workspace.name };
}

export async function signFor(
  token: string,
  input: { name: string; code: string; ip: string; userAgent?: string | null },
  now = new Date(),
) {
  const found = await proposalByLink(publicDb(), token, now);
  await signProposal(
    publicDb(),
    token,
    {
      name: input.name,
      email: found.proposal.sentTo ?? '',
      code: input.code,
      ip: input.ip,
      userAgent: input.userAgent ?? null,
    },
    now,
  );
  await emailsQueued(found.proposal.workspaceId);
}

export async function declineFor(token: string, reason: string, now = new Date()) {
  await dbDeclineProposal(publicDb(), token, reason || null, now);
  const found = await proposalByLink(publicDb(), token, now);
  await emailsQueued(found.proposal.workspaceId);
}

/** The client's question from the link: on the proposal's timeline, and to the sender. */
export async function askFor(token: string, question: string, now = new Date()) {
  const { workspaceId } = await askAboutProposal(publicDb(), token, question, now);
  await emailsQueued(workspaceId);
}
