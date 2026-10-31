// Server only. What the command palette searches: every record, with a line saying what it is.
import { formatMoney, LEAD_SOURCE_LABELS } from '@agency-os/core';
import { ctxFor } from './ctx';
import { searchFor } from './db/search';
import { store } from './shared';
import {
  invoiceState,
  invoiceTotals,
  leadTitle,
  proposalStatus,
  PROPOSAL_STATUS_LABELS,
  quoteTotals,
  stageName,
} from './views';

export type SearchKind = 'lead' | 'client' | 'project' | 'invoice' | 'proposal' | 'task';

export type SearchItem = {
  id: string;
  kind: SearchKind;
  label: string;
  meta: string;
  href: string;
  /** Extra words that find it: emails, phone numbers, invoice numbers. */
  keywords: string[];
};

/** At most this many matches of each kind, as on the database. */
const PER_KIND = 8;

/** What matches the words typed in the command palette: the database searches when signed in. */
export async function search(query: string, slug: string): Promise<SearchItem[]> {
  if (!query.trim()) return [];
  const ctx = await ctxFor(slug);
  if (ctx) return searchFor(ctx, slug, query);
  const words = query.trim().toLowerCase().split(/\s+/);
  const digits = query.replace(/\D/g, '');
  const counts = new Map<SearchKind, number>();
  return exampleIndex(slug).filter((item) => {
    const text = [item.label, item.meta, ...item.keywords].join(' ').toLowerCase();
    const found =
      words.every((w) => text.includes(w)) ||
      (digits.length >= 4 && item.keywords.some((k) => k.replace(/\D/g, '').includes(digits)));
    const n = counts.get(item.kind) ?? 0;
    if (!found || n >= PER_KIND) return false;
    counts.set(item.kind, n + 1);
    return true;
  });
}

/** Example mode: every record, with its line, searched in memory (the example store is small). */
function exampleIndex(slug: string): SearchItem[] {
  const s = store();
  const ws = (p: string) => `/w/${slug}${p}`;
  const items: SearchItem[] = [];
  for (const l of s.leads)
    items.push({
      id: `lead-${l.id}`,
      kind: 'lead',
      label: leadTitle(l),
      meta: `Lead · ${stageName(l.stage)} · ${formatMoney(l.valueMinor, 'INR', { decimals: 0 })}`,
      href: ws(`/leads/${l.id}`),
      keywords: [l.name, l.email ?? '', l.phone ?? '', LEAD_SOURCE_LABELS[l.source]].filter(
        Boolean,
      ),
    });
  for (const c of s.clients)
    items.push({
      id: `client-${c.id}`,
      kind: 'client',
      label: c.name,
      meta: `Client · ${c.contactName}${c.city ? ` · ${c.city}` : ''}`,
      href: ws(`/clients/${c.id}`),
      keywords: [c.contactName, c.email ?? '', c.phone ?? '', c.gstin ?? ''].filter(Boolean),
    });
  for (const p of s.projects) {
    const client = s.clients.find((c) => c.id === p.clientId);
    items.push({
      id: `project-${p.id}`,
      kind: 'project',
      label: p.name,
      meta: `Project · ${client?.name ?? ''}`,
      href: ws(`/projects/${p.id}`),
      keywords: [client?.name ?? '', p.lead],
    });
  }
  for (const inv of s.invoices) {
    const client = s.clients.find((c) => c.id === inv.clientId)!;
    const totals = invoiceTotals(inv, client, s.settings);
    const state = invoiceState(inv, totals.total.amountMinor);
    items.push({
      id: `invoice-${inv.id}`,
      kind: 'invoice',
      label: inv.number ?? `Draft invoice for ${client.name}`,
      meta: `Invoice · ${client.name} · ${state.statusText}`,
      href: ws(`/invoices/${inv.id}`),
      keywords: [client.name, formatMoney(totals.total.amountMinor, inv.currency)],
    });
  }
  for (const p of s.proposals) {
    const q = s.quotes.find((x) => x.id === p.quoteId)!;
    items.push({
      id: `proposal-${p.id}`,
      kind: 'proposal',
      label: p.title,
      meta: `Proposal · ${PROPOSAL_STATUS_LABELS[proposalStatus(p)]} · ${formatMoney(quoteTotals(q, s.settings).total.amountMinor, q.currency)}`,
      href: ws(`/sales/proposals/${p.id}`),
      keywords: [q.number, q.recipient],
    });
  }
  for (const t of s.tasks) {
    const project = s.projects.find((p) => p.id === t.projectId);
    items.push({
      id: `task-${t.id}`,
      kind: 'task',
      label: t.title,
      meta: `Task · ${project?.name ?? ''} · ${t.assignee}`,
      href: ws(`/tasks/${t.id}`),
      keywords: [t.assignee, project?.name ?? ''],
    });
  }
  return items;
}
