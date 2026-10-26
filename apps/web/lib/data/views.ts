// What the screens show, worked out from the records. Pure functions, unit-tested.
import {
  calculateInvoice,
  calculateQuote,
  formatDate,
  formatMoney,
  LEAD_SOURCE_LABELS,
  type InvoiceTotals,
  type ProposalBlock,
} from '@agency-os/core';
import type { Client, Invoice, Lead, Proposal, Quote, StageId, WorkspaceSettings } from './types';
import { STAGES } from './types';

const TZ = 'Asia/Kolkata';
const DAY = 24 * 60 * 60 * 1000;

/** The calendar date in IST as YYYY-MM-DD. */
export function istDate(at: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(at));
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / DAY);
}

/** "11:00 am" in IST. */
export const istTime = (at: string) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
    .format(new Date(at))
    .replace(/\u202f/g, ' ')
    .toLowerCase();

/** "Today, 11:00 am", "Tomorrow, 11:00 am", "Thu 29 Oct, 11:00 am"; overdue when in the past. */
export function followUp(
  at: string | null,
  now = new Date(),
): { text: string; overdue: boolean } | null {
  if (!at) return null;
  const days = daysBetween(istDate(now), istDate(at));
  const overdue = new Date(at).getTime() < now.getTime() && days < 0;
  if (overdue) {
    return { text: `Was due ${formatDate(at, { year: false, timeZone: TZ })}`, overdue: true };
  }
  const when =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : new Intl.DateTimeFormat('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: TZ,
          }).format(new Date(at));
  return { text: `${when}, ${istTime(at)}`, overdue: false };
}

/** "2 h ago", "Yesterday", "Mon", then the date after a week (content-style.md). */
export function relativeTime(at: string, now = new Date()): string {
  const ms = now.getTime() - new Date(at).getTime();
  if (ms < 60_000) return 'Just now';
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)} min ago`;
  const days = daysBetween(istDate(at), istDate(now));
  if (days === 0) return `${Math.floor(ms / (60 * 60_000))} h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: TZ }).format(
      new Date(at),
    );
  return formatDate(at, { year: false, timeZone: TZ });
}

export function stageName(stage: StageId): string {
  return STAGES.find((s) => s.id === stage)!.name;
}

export function leadTitle(lead: Lead): string {
  return lead.company ?? lead.name;
}

export type BoardCard = {
  id: string;
  name: string;
  service: string;
  value: string;
  source: string;
  owner: string;
  due?: string;
  overdue?: boolean;
};

export type BoardColumn = {
  id: StageId;
  name: string;
  total: string;
  won?: boolean;
  cards: BoardCard[];
};

export function leadBoard(leads: Lead[], now = new Date()): BoardColumn[] {
  return STAGES.map((stage) => {
    const inStage = leads.filter((l) => l.stage === stage.id);
    const total = inStage.reduce((sum, l) => sum + l.valueMinor, 0n);
    return {
      id: stage.id,
      name: stage.name,
      total: formatMoney(total, 'INR', { compact: true }),
      won: stage.id === 'won' || undefined,
      cards: inStage.map((l) => {
        const f = followUp(l.followUpAt, now);
        return {
          id: l.id,
          name: leadTitle(l),
          service: l.service,
          value: formatMoney(l.valueMinor, 'INR', { decimals: 0 }),
          source: LEAD_SOURCE_LABELS[l.source],
          owner: l.owner,
          due: f?.text,
          overdue: f?.overdue || undefined,
        };
      }),
    };
  });
}

/** GST on an invoice: the workspace's state against the client's state, or export. */
export function invoiceTotals(
  invoice: Pick<Invoice, 'currency' | 'lines' | 'exchangeRate'>,
  client: Pick<Client, 'country' | 'stateCode'>,
  settings: Pick<WorkspaceSettings, 'stateCode' | 'lutArn'>,
): InvoiceTotals {
  return calculateInvoice({
    currency: invoice.currency,
    supplierStateCode: settings.stateCode ?? undefined,
    placeOfSupply:
      client.country === 'IN'
        ? { kind: 'india', stateCode: client.stateCode ?? settings.stateCode ?? '37' }
        : { kind: 'export', country: client.country },
    hasValidLut: Boolean(settings.lutArn),
    lines: invoice.lines,
    exchangeRateToInr: invoice.exchangeRate ?? undefined,
  });
}

export type InvoiceState = {
  status: 'draft' | 'due' | 'overdue' | 'paid' | 'partially_paid';
  statusText: string;
  paidMinor: bigint;
  dueMinor: bigint;
};

export function invoiceState(
  invoice: Pick<Invoice, 'number' | 'dueOn' | 'payments' | 'currency'>,
  totalMinor: bigint,
  now = new Date(),
): InvoiceState {
  const paidMinor = invoice.payments.reduce((sum, p) => sum + p.amountMinor, 0n);
  const dueMinor = totalMinor - paidMinor;
  if (!invoice.number) return { status: 'draft', statusText: 'Draft', paidMinor, dueMinor };
  if (dueMinor <= 0n) return { status: 'paid', statusText: 'Paid', paidMinor, dueMinor: 0n };
  const lateBy = daysBetween(invoice.dueOn, istDate(now));
  if (lateBy > 0) {
    return {
      status: 'overdue',
      statusText: `${lateBy} ${lateBy === 1 ? 'day' : 'days'} overdue`,
      paidMinor,
      dueMinor,
    };
  }
  if (paidMinor > 0n) {
    return {
      status: 'partially_paid',
      statusText: `${formatMoney(dueMinor, invoice.currency)} due`,
      paidMinor,
      dueMinor,
    };
  }
  return {
    status: 'due',
    statusText: `Due ${formatDate(invoice.dueOn, { year: false })}`,
    paidMinor,
    dueMinor,
  };
}

export const DOCUMENT_TYPE_LABELS: Record<InvoiceTotals['documentType'], string> = {
  tax_invoice: 'Tax invoice',
  export_invoice: 'Export invoice',
  bill_of_supply: 'Bill of supply',
};

/** Budget used as a whole percentage, capped at 100 for the bar. */
export function budgetUsed(usedMinor: bigint, budgetMinor: bigint): number {
  if (budgetMinor <= 0n) return 0;
  return Math.min(100, Number((usedMinor * 100n) / budgetMinor));
}

/** The IST calendar date a number of days from now: default due and start dates. */
export function istDateIn(days: number, from = new Date()): string {
  return istDate(new Date(from.getTime() + days * DAY));
}

/** Quote totals: the whole-quote discount spread over the lines, then the invoice GST rules. */
export function quoteTotals(
  quote: Pick<Quote, 'currency' | 'lines' | 'discountMinor' | 'country' | 'stateCode'>,
  settings: Pick<WorkspaceSettings, 'stateCode' | 'lutArn'>,
): InvoiceTotals {
  return calculateQuote({
    currency: quote.currency,
    supplierStateCode: settings.stateCode ?? undefined,
    placeOfSupply:
      quote.country === 'IN'
        ? { kind: 'india', stateCode: quote.stateCode ?? settings.stateCode ?? '37' }
        : { kind: 'export', country: quote.country },
    hasValidLut: Boolean(settings.lutArn),
    lines: quote.lines,
    discountMinor: quote.discountMinor,
  });
}

export type ProposalView = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

/** What a proposal's status is today: sent or viewed proposals expire after their valid-until date. */
export function proposalStatus(
  p: Pick<Proposal, 'status' | 'validUntil'>,
  now = new Date(),
): ProposalView {
  if ((p.status === 'sent' || p.status === 'viewed') && p.validUntil < istDate(now))
    return 'expired';
  return p.status;
}

export const PROPOSAL_STATUS_LABELS: Record<ProposalView, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
};

/** Due text for a task: "Today", "Tomorrow", "Thu 29 Oct", or overdue. */
export function taskDue(
  dueOn: string | null,
  done: boolean,
  now = new Date(),
): { text: string; overdue: boolean } {
  if (!dueOn) return { text: 'No due date', overdue: false };
  const days = daysBetween(istDate(now), dueOn);
  const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : formatDate(dueOn, { year: false });
  if (days < 0 && !done) return { text: `${label} (overdue)`, overdue: true };
  return { text: label, overdue: false };
}

/** Names mentioned in a comment: "@Ananya Iyer can you…" → ["Ananya Iyer"]. */
export function mentions(text: string, people: readonly string[]): string[] {
  return people.filter((name) => text.includes(`@${name}`));
}

export type ProposalText = {
  about: string;
  goals: string[];
  included: string[];
  excluded: string[];
  paymentTerms: string;
  terms: string;
};

/** Puts the editor's text into the blocks; a block the user filled in stops being a placeholder. */
export function applyProposalText(blocks: ProposalBlock[], t: ProposalText): ProposalBlock[] {
  return blocks.map((b) => {
    if (b.type === 'text' && b.heading === 'About us')
      return t.about ? { ...b, body: t.about, placeholder: false } : b;
    if (b.type === 'list' && b.heading === 'Your goals')
      return t.goals.length ? { ...b, items: t.goals, placeholder: false } : b;
    if (b.type === 'scope') return { ...b, included: t.included, excluded: t.excluded };
    if (b.type === 'text' && b.heading === 'Payment terms') return { ...b, body: t.paymentTerms };
    if (b.type === 'text' && b.heading === 'Terms')
      return t.terms ? { ...b, body: t.terms, placeholder: false } : b;
    return b;
  });
}

/** A future date in words: "today", "tomorrow", "in 5 days" (or "2 days ago" once it's passed). */
export function dueIn(at: string, now = new Date()): string {
  const days = daysBetween(istDate(now), istDate(at));
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  return days === -1 ? 'yesterday' : `${-days} days ago`;
}

/** relativeTime for use mid-sentence: "sent just now", "sent yesterday", but "sent Sat". */
export function relativeInSentence(at: string, now = new Date()): string {
  return relativeTime(at, now).replace(/^(Just now|Yesterday)$/, (m) => m.toLowerCase());
}
