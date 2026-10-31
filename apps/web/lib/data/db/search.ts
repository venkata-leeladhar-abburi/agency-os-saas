// Server only. The command palette's search on the database: what the member can see (RLS), in
// the same words as example mode.
import { formatMoney } from '@agency-os/core';
import { searchRecords, type SearchRow } from '@agency-os/db';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import type { SearchItem } from '../search';

const INVOICE_STATUS: Record<string, string> = {
  draft: 'Draft',
  issued: 'Issued',
  partially_paid: 'Part paid',
  paid: 'Paid',
  cancelled: 'Cancelled',
};
const PROPOSAL_STATUS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
};

function itemOf(r: SearchRow, ws: (p: string) => string): SearchItem {
  const money = (decimals?: 0) =>
    r.amountMinor !== null && r.currency
      ? formatMoney(r.amountMinor, r.currency, decimals === 0 ? { decimals: 0 } : undefined)
      : '';
  const line = (...parts: (string | null)[]) => parts.filter(Boolean).join(' · ');
  const base = { id: `${r.kind}-${r.id}`, kind: r.kind, keywords: [] };
  switch (r.kind) {
    case 'lead':
      return {
        ...base,
        label: r.label,
        meta: line('Lead', r.detail, money(0)),
        href: ws(`/leads/${r.id}`),
      };
    case 'client':
      return {
        ...base,
        label: r.label,
        meta: line('Client', r.detail),
        href: ws(`/clients/${r.id}`),
      };
    case 'project':
      return {
        ...base,
        label: r.label,
        meta: line('Project', r.detail),
        href: ws(`/projects/${r.id}`),
      };
    case 'invoice':
      return {
        ...base,
        label: r.label || `Draft invoice for ${r.detail ?? 'a client'}`,
        meta: line('Invoice', r.detail, INVOICE_STATUS[r.extra ?? ''] ?? null, money()),
        href: ws(`/invoices/${r.id}`),
      };
    case 'proposal':
      return {
        ...base,
        label: r.label,
        meta: line('Proposal', PROPOSAL_STATUS[r.detail ?? ''] ?? null, money()),
        href: ws(`/sales/proposals/${r.id}`),
      };
    case 'task':
      return {
        ...base,
        label: r.label,
        meta: line('Task', r.detail, r.extra),
        href: ws(`/tasks/${r.id}`),
      };
  }
}

/**
 * What matches the words typed in the palette, found by the database (PRD E0.3: quick at 10,000
 * records). Only what the member can see.
 */
export async function searchFor(ctx: WorkspaceCtx, slug: string, query: string) {
  const rows = await asMember(ctx, (tx) => searchRecords(tx, ctx.workspaceId, query));
  return rows.map((r) => itemOf(r, (p) => `/w/${slug}${p}`));
}
