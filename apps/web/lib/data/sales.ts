// Server only. Quotes and proposals: build, send, view, sign or decline.
import { randomBytes, randomInt } from 'node:crypto';
import {
  formatDate,
  formatMoney,
  formatQuoteNumber,
  PROPOSAL_VALIDITY_DAYS,
  SEVEN_PHASES,
  standardProposal,
} from '@agency-os/core';
import type { QuoteInput } from '../forms';
import { winLead } from './index';
import { activity, EXAMPLE_USER, newId, store } from './shared';
import type { Proposal } from './types';
import {
  applyProposalText,
  istDate,
  istDateIn,
  proposalStatus,
  quoteTotals,
  type ProposalText,
  type ProposalView,
} from './views';

const CODE_MINUTES = 10;
const CODE_TRIES = 5;

export type SalesRow = {
  id: string;
  kind: 'Quote' | 'Proposal';
  title: string;
  number: string;
  forName: string;
  amount: string;
  status: string;
  statusKey: ProposalView | 'quote';
  updated: string;
  href: string;
};

function quoteView(id: string) {
  const quote = store().quotes.find((q) => q.id === id);
  if (!quote) return null;
  return { quote, totals: quoteTotals(quote, store().settings) };
}

export async function salesDocs(slug: string): Promise<SalesRow[]> {
  const now = new Date();
  const proposals = store().proposals.map((p): SalesRow => {
    const q = quoteView(p.quoteId)!;
    const status = proposalStatus(p, now);
    return {
      id: p.id,
      kind: 'Proposal',
      title: p.title,
      number: q.quote.number,
      forName: q.quote.recipient,
      amount: formatMoney(q.totals.total.amountMinor, q.quote.currency),
      status: status === 'viewed' ? `Viewed ${p.views}×` : statusLabel(status),
      statusKey: status,
      updated: formatDate(p.sentAt ?? p.createdAt, { year: false }),
      href: `/w/${slug}/sales/proposals/${p.id}`,
    };
  });
  const quotes = store()
    .quotes.filter((q) => !store().proposals.some((p) => p.quoteId === q.id))
    .map((q): SalesRow => {
      const v = quoteView(q.id)!;
      return {
        id: q.id,
        kind: 'Quote',
        title: `Quote for ${q.recipient}`,
        number: q.number,
        forName: q.recipient,
        amount: formatMoney(v.totals.total.amountMinor, q.currency),
        status: 'Quote only',
        statusKey: 'quote',
        updated: formatDate(q.createdAt, { year: false }),
        href: `/w/${slug}/sales/quotes/${q.id}`,
      };
    });
  return [...proposals, ...quotes];
}

function statusLabel(s: ProposalView) {
  return {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    accepted: 'Signed',
    declined: 'Declined',
    expired: 'Expired',
  }[s];
}

export async function getQuote(id: string) {
  const v = quoteView(id);
  if (!v) return null;
  const proposal = store().proposals.find((p) => p.quoteId === id) ?? null;
  return { ...v, proposal, settings: store().settings };
}

/** Who a quote can be for: open leads and every client. */
export async function quoteRecipients() {
  return {
    leads: store()
      .leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost')
      .map((l) => ({ id: l.id, name: l.company ?? l.name })),
    clients: store().clients.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      stateCode: c.stateCode,
    })),
  };
}

export async function nextQuoteNumber() {
  return formatQuoteNumber(store().settings.invoicePrefix, new Date(), store().quoteSequence + 1);
}

export async function createQuote(input: QuoteInput): Promise<string> {
  const s = store();
  const lead = input.leadId ? s.leads.find((l) => l.id === input.leadId) : undefined;
  const client = input.clientId
    ? s.clients.find((c) => c.id === input.clientId)
    : lead?.clientId
      ? s.clients.find((c) => c.id === lead.clientId)
      : undefined;
  s.quoteSequence += 1;
  const id = newId('q');
  s.quotes.unshift({
    id,
    number: formatQuoteNumber(s.settings.invoicePrefix, new Date(), s.quoteSequence),
    leadId: lead?.id ?? null,
    clientId: client?.id ?? null,
    recipient: client?.name ?? lead?.company ?? lead?.name ?? '',
    country: input.country,
    stateCode: input.stateCode,
    currency: input.currency,
    validUntil: input.validUntil,
    lines: input.lines,
    discountMinor: input.discountMinor,
    createdAt: new Date().toISOString(),
  });
  lead?.activities.unshift(activity('created', 'made a quote'));
  return id;
}

/** A proposal from the Standard proposal template, filled from the quote and the workspace. */
export async function createProposal(quoteId: string): Promise<string | null> {
  const s = store();
  const existing = s.proposals.find((p) => p.quoteId === quoteId);
  if (existing) return existing.id;
  const quote = s.quotes.find((q) => q.id === quoteId);
  if (!quote) return null;
  const lead = quote.leadId ? s.leads.find((l) => l.id === quote.leadId) : undefined;
  const client = quote.clientId ? s.clients.find((c) => c.id === quote.clientId) : undefined;
  const id = newId('p');
  s.proposals.unshift({
    id,
    quoteId,
    title: `Proposal for ${quote.recipient}`,
    email: client?.email ?? lead?.email ?? null,
    status: 'draft',
    blocks: standardProposal({
      clientName: quote.recipient,
      date: istDate(new Date()),
      preparedBy: EXAMPLE_USER.name,
      quoteId,
      scope: quote.lines.map((l) => l.description),
      phases: SEVEN_PHASES.phases.map((p) => ({ name: p.name, clientSignOff: Boolean(p.gate) })),
    }),
    token: randomBytes(16).toString('base64url'),
    views: 0,
    lastViewedAt: null,
    sentAt: null,
    validUntil: istDateIn(PROPOSAL_VALIDITY_DAYS),
    signature: null,
    declineReason: null,
    pendingCode: null,
    activities: [activity('created', 'started the proposal')],
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getProposal(id: string) {
  const proposal = store().proposals.find((p) => p.id === id);
  if (!proposal) return null;
  const v = quoteView(proposal.quoteId)!;
  return { proposal, ...v, status: proposalStatus(proposal), settings: store().settings };
}

export async function saveProposalText(id: string, t: ProposalText) {
  const p = store().proposals.find((x) => x.id === id);
  if (!p || p.status === 'accepted' || p.status === 'declined') return;
  p.blocks = applyProposalText(p.blocks, t);
}

export async function sendProposal(id: string, email: string) {
  const s = store();
  const p = s.proposals.find((x) => x.id === id);
  if (!p) return;
  p.email = email;
  p.status = p.status === 'draft' ? 'sent' : p.status;
  p.sentAt = new Date().toISOString();
  if (p.validUntil < istDate(new Date())) p.validUntil = istDateIn(PROPOSAL_VALIDITY_DAYS);
  p.activities.unshift(activity('sent', `sent the proposal to ${email}`));
  const quote = s.quotes.find((q) => q.id === p.quoteId);
  const lead = quote?.leadId ? s.leads.find((l) => l.id === quote.leadId) : undefined;
  if (lead && (lead.stage === 'new' || lead.stage === 'contacted')) {
    lead.stage = 'proposal';
    lead.activities.unshift(activity('sent', 'sent the proposal'));
  }
}

// ---------- The client's side (public link) ----------

/** The proposal behind a public link. Counts a view unless the agency is previewing it. */
export async function proposalByToken(token: string, countView: boolean) {
  const p = store().proposals.find((x) => x.token === token && x.status !== 'draft');
  if (!p) return null;
  if (countView && (p.status === 'sent' || p.status === 'viewed')) {
    p.views += 1;
    p.lastViewedAt = new Date().toISOString();
    if (p.status === 'sent' || p.views === 1) {
      const quote = store().quotes.find((q) => q.id === p.quoteId);
      p.activities.unshift(
        activity('viewed', 'viewed the proposal', quote?.recipient ?? 'The client'),
      );
    }
    p.status = 'viewed';
  }
  return {
    proposal: p,
    ...quoteView(p.quoteId)!,
    status: proposalStatus(p),
    workspace: store().settings.name,
  };
}

type Outcome = { ok: true } | { ok: false; field?: string; error: string };

function signable(p: Proposal | undefined): p is Proposal {
  return Boolean(p) && (proposalStatus(p!) === 'sent' || proposalStatus(p!) === 'viewed');
}

/** Step one of signing: a 6-digit code to the client's email, valid for 10 minutes. */
export async function startSigning(token: string): Promise<Outcome & { code?: string }> {
  const p = store().proposals.find((x) => x.token === token);
  if (!signable(p)) return { ok: false, error: 'This proposal can no longer be signed.' };
  if (!p.email)
    return {
      ok: false,
      error: 'There’s no email to send the code to. Ask the agency to resend the proposal.',
    };
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  p.pendingCode = {
    code,
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
    tries: 0,
  };
  // Emails go out once Resend is connected; until then the example screen shows the code.
  return { ok: true, code };
}

/** Step two: the right code, in time, within 5 tries, records the signature. */
export async function acceptProposal(
  token: string,
  input: { name: string; code: string; ip: string },
): Promise<Outcome> {
  const s = store();
  const p = s.proposals.find((x) => x.token === token);
  if (!signable(p)) return { ok: false, error: 'This proposal can no longer be signed.' };
  if (input.name.trim().length < 2)
    return { ok: false, field: 'name', error: 'Type your full name to sign.' };
  const pending = p.pendingCode;
  if (!pending || new Date(pending.expiresAt) < new Date())
    return { ok: false, field: 'code', error: 'This code has expired. Ask for a new one.' };
  if (pending.tries >= CODE_TRIES)
    return { ok: false, field: 'code', error: 'Too many wrong codes. Ask for a new one.' };
  if (pending.code !== input.code) {
    pending.tries += 1;
    const left = CODE_TRIES - pending.tries;
    return {
      ok: false,
      field: 'code',
      error: left
        ? `That code doesn’t match. You have ${left} ${left === 1 ? 'try' : 'tries'} left.`
        : 'Too many wrong codes. Ask for a new one.',
    };
  }
  p.pendingCode = null;
  p.status = 'accepted';
  p.signature = { name: input.name, email: p.email!, at: new Date().toISOString(), ip: input.ip };
  p.activities.unshift(activity('signed', 'signed the proposal', input.name));
  const quote = s.quotes.find((q) => q.id === p.quoteId);
  if (quote?.leadId) {
    const clientId = await winLead(quote.leadId);
    if (clientId) quote.clientId = clientId;
  }
  return { ok: true };
}

export async function declineProposal(token: string, reason: string): Promise<Outcome> {
  const p = store().proposals.find((x) => x.token === token);
  if (!signable(p)) return { ok: false, error: 'This proposal can no longer be declined.' };
  p.status = 'declined';
  p.declineReason = reason || null;
  const quote = store().quotes.find((q) => q.id === p.quoteId);
  p.activities.unshift(
    activity(
      'declined',
      reason ? `declined: ${reason}` : 'declined the proposal',
      quote?.recipient ?? 'The client',
    ),
  );
  return { ok: true };
}

/** A lead's or client's quotes and proposals, newest first. */
export async function docsFor(filter: { leadId?: string; clientId?: string }, slug: string) {
  return (await salesDocs(slug)).filter((row) => {
    const quoteId =
      row.kind === 'Quote' ? row.id : store().proposals.find((p) => p.id === row.id)?.quoteId;
    const q = store().quotes.find((x) => x.id === quoteId);
    return (
      (filter.leadId && q?.leadId === filter.leadId) ||
      (filter.clientId && q?.clientId === filter.clientId)
    );
  });
}
