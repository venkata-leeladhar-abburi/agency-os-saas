// Server only. Quotes and proposals: build, send, view, sign or decline.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  formatDate,
  formatMoney,
  formatQuoteNumber,
  PROPOSAL_VALIDITY_DAYS,
  SEVEN_PHASES,
  standardProposal,
} from '@agency-os/core';
import type { QuoteInput } from '../forms';
import { AccountError } from '@agency-os/db';
import { renderSigningCode } from '@agency-os/emails';
import { emailReady, sendEmail } from '../email';
import { ctxFor, exampleMode } from './ctx';
import * as dbSales from './db/sales';
import { winLead } from './index';
import { notify } from './notifications';
import { activity, brandOf, EXAMPLE_USER, newId, store } from './shared';
import type { Proposal, Quote } from './types';
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

const PROPOSAL_STATUS_TEXT = (s: ProposalView, views: number) =>
  s === 'viewed' ? `Viewed ${views}×` : statusLabel(s);

export async function salesDocs(slug: string): Promise<SalesRow[]> {
  const ctx = await ctxFor(slug);
  if (ctx)
    return (await dbSales.salesItems(ctx)).map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      number: i.number,
      forName: i.forName,
      amount: dbSales.salesAmount(i),
      status: i.status === 'quote' ? 'Quote only' : PROPOSAL_STATUS_TEXT(i.status, i.views),
      statusKey: i.status,
      updated: dbSales.salesDate(i),
      href: `/w/${slug}/sales/${i.kind === 'Quote' ? 'quotes' : 'proposals'}/${i.id}`,
    }));
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
      status: PROPOSAL_STATUS_TEXT(status, p.views),
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

export async function getQuote(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.quoteDetail(ctx, id);
  const v = quoteView(id);
  if (!v) return null;
  const proposal = store().proposals.find((p) => p.quoteId === id) ?? null;
  return { ...v, proposal, settings: store().settings };
}

/** Who a quote can be for: open leads and every client. */
export async function quoteRecipients(slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.recipients(ctx);
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

export async function nextQuoteNumber(slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.nextNumber(ctx);
  return formatQuoteNumber(store().settings.invoicePrefix, new Date(), store().quoteSequence + 1);
}

export async function createQuote(input: QuoteInput, slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.createQuoteFor(ctx, input);
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
export async function createProposal(quoteId: string, slug?: string): Promise<string | null> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.createProposalFor(ctx, quoteId);
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

/** The proposal page: with `hash`, the fingerprint of what it says now (for the signed PDF). */
export async function getProposal(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.proposalDetail(ctx, id);
  const proposal = store().proposals.find((p) => p.id === id);
  if (!proposal) return null;
  const v = quoteView(proposal.quoteId)!;
  return {
    proposal,
    ...v,
    status: proposalStatus(proposal),
    settings: store().settings,
    hash: proposalHash(proposal, v.quote),
  };
}

export async function saveProposalText(id: string, t: ProposalText, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.saveProposalTextFor(ctx, id, t);
  const p = store().proposals.find((x) => x.id === id);
  if (!p || p.status === 'accepted' || p.status === 'declined') return;
  p.blocks = applyProposalText(p.blocks, t);
}

export async function sendProposal(id: string, email: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbSales.sendProposalFor(ctx, id, email);
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
export async function proposalByToken(
  token: string,
  countView: boolean,
  request: { ip?: string | null; userAgent?: string | null } = {},
) {
  if (!exampleMode()) return dbSales.proposalForLink(token, countView, request);
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
      notify(
        'proposal_viewed',
        `${quote?.recipient ?? 'The client'} viewed your proposal`,
        p.title,
        `/sales/proposals/${p.id}`,
      );
    }
    p.status = 'viewed';
  }
  return {
    proposal: p,
    ...quoteView(p.quoteId)!,
    status: proposalStatus(p),
    workspace: store().settings.name,
    settings: store().settings,
    brand: brandOf(),
    hash: proposalHash(p, quoteView(p.quoteId)!.quote),
  };
}

/**
 * SHA-256 of what the client agrees to: the proposal's text and the quote's lines and
 * prices. Stored with the signature, printed on the signed PDF's audit page.
 */
export function proposalHash(p: Proposal, quote: Quote | null): string {
  const version = {
    title: p.title,
    blocks: p.blocks,
    validUntil: p.validUntil,
    quote: quote && {
      number: quote.number,
      currency: quote.currency,
      lines: quote.lines,
      discountMinor: quote.discountMinor,
      country: quote.country,
      stateCode: quote.stateCode,
    },
  };
  const json = JSON.stringify(version, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  return createHash('sha256').update(json).digest('hex');
}

type Outcome = { ok: true } | { ok: false; field?: string; error: string };

function signable(p: Proposal | undefined): p is Proposal {
  return Boolean(p) && (proposalStatus(p!) === 'sent' || proposalStatus(p!) === 'viewed');
}

/** The database's errors in the signing form's words, on the field they belong to. */
function signingError(error: unknown): Outcome {
  if (!(error instanceof AccountError)) throw error;
  const field = error.code.startsWith('signing_code')
    ? 'code'
    : error.code === 'signer_name_required'
      ? 'name'
      : undefined;
  return { ok: false, field, error: error.message };
}

/** Step one of signing: a 6-digit code to the client's email, valid for 10 minutes. */
export async function startSigning(token: string): Promise<Outcome & { code?: string }> {
  if (!exampleMode()) {
    if (!emailReady())
      return {
        ok: false,
        error: 'Signing isn’t available yet because email isn’t set up. Ask the agency to help.',
      };
    try {
      const started = await dbSales.signingCodeFor(token);
      const mail = await renderSigningCode({
        agency: { name: started.agency },
        title: started.title,
        code: started.code,
        minutes: CODE_MINUTES,
      });
      const sent = await sendEmail({ to: started.email, ...mail });
      if (!sent.ok)
        return { ok: false, error: 'We couldn’t send the code. Try again in a minute.' };
      return { ok: true };
    } catch (error) {
      return signingError(error);
    }
  }
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
  input: { name: string; code: string; ip: string; userAgent?: string | null },
): Promise<Outcome> {
  if (!exampleMode()) {
    try {
      await dbSales.signFor(token, input);
      return { ok: true };
    } catch (error) {
      return signingError(error);
    }
  }
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
  const quote = s.quotes.find((q) => q.id === p.quoteId);
  p.signature = {
    name: input.name,
    email: p.email!,
    at: new Date().toISOString(),
    ip: input.ip,
    method: 'email_code',
    userAgent: input.userAgent ?? null,
    documentHash: proposalHash(p, quote ?? null),
  };
  p.activities.unshift(activity('signed', 'signed the proposal', input.name));
  notify(
    'proposal_decided',
    `${input.name} signed the proposal`,
    p.title,
    `/sales/proposals/${p.id}`,
  );
  if (quote?.leadId) {
    const clientId = await winLead(quote.leadId);
    if (clientId) quote.clientId = clientId;
  }
  return { ok: true };
}

export async function declineProposal(token: string, reason: string): Promise<Outcome> {
  if (!exampleMode()) {
    try {
      await dbSales.declineFor(token, reason);
      return { ok: true };
    } catch (error) {
      return signingError(error);
    }
  }
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
  notify(
    'proposal_decided',
    `${quote?.recipient ?? 'The client'} declined the proposal`,
    reason ? `Their reason: ${reason}` : p.title,
    `/sales/proposals/${p.id}`,
  );
  return { ok: true };
}

/** The client asks a question from the proposal's link, while it's open. */
export async function askAboutProposal(token: string, question: string): Promise<Outcome> {
  if (!exampleMode()) {
    try {
      await dbSales.askFor(token, question);
      return { ok: true };
    } catch (error) {
      if (!(error instanceof AccountError)) throw error;
      return {
        ok: false,
        field: error.code.startsWith('question') ? 'question' : undefined,
        error: error.message,
      };
    }
  }
  const text = question.trim();
  if (!text) return { ok: false, field: 'question', error: 'Write your question first.' };
  if (text.length > 2000)
    return { ok: false, field: 'question', error: 'Keep your question under 2,000 characters.' };
  const p = store().proposals.find((x) => x.token === token);
  if (!signable(p)) return { ok: false, error: 'This proposal is closed to questions now.' };
  const quote = store().quotes.find((q) => q.id === p.quoteId);
  const who = quote?.recipient ?? 'The client';
  p.activities.unshift(activity('question', `asked: “${text}”`, who));
  notify('proposal_question', `${who} asked about your proposal`, text, `/sales/proposals/${p.id}`);
  return { ok: true };
}

/** A lead's or client's quotes and proposals, newest first. */
export async function docsFor(filter: { leadId?: string; clientId?: string }, slug: string) {
  const ctx = await ctxFor(slug);
  if (ctx) {
    const ids = new Set(
      (await dbSales.salesItems(ctx))
        .filter(
          (i) =>
            (filter.leadId && i.leadId === filter.leadId) ||
            (filter.clientId && i.clientId === filter.clientId),
        )
        .map((i) => i.id),
    );
    return (await salesDocs(slug)).filter((row) => ids.has(row.id));
  }
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
