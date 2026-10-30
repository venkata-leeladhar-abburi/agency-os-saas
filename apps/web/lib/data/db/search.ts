// Server only. The command palette's index on the database: what the member can see (RLS), in
// the same words as example mode.
import { formatMoney, LEAD_SOURCE_LABELS } from '@agency-os/core';
import type { WorkspaceCtx } from '../../server/workspace';
import type { SearchItem } from '../search';
import { leadTitle, PROPOSAL_STATUS_LABELS, stageName } from '../views';
import { salesItems } from './sales';
import { snapshot } from './snapshot';

export async function searchIndexFor(ctx: WorkspaceCtx, slug: string): Promise<SearchItem[]> {
  const [s, sales] = await Promise.all([snapshot(ctx), salesItems(ctx)]);
  const ws = (p: string) => `/w/${slug}${p}`;
  const clientName = (id: string) => s.clients.find((c) => c.id === id)?.name ?? '';
  return [
    ...s.leads.map((l) => ({
      id: `lead-${l.id}`,
      kind: 'lead' as const,
      label: leadTitle(l),
      meta: `Lead · ${stageName(l.stage)} · ${formatMoney(l.valueMinor, 'INR', { decimals: 0 })}`,
      href: ws(`/leads/${l.id}`),
      keywords: [l.name, l.email ?? '', l.phone ?? '', LEAD_SOURCE_LABELS[l.source]].filter(
        Boolean,
      ),
    })),
    ...s.clients.map((c) => ({
      id: `client-${c.id}`,
      kind: 'client' as const,
      label: c.name,
      meta: `Client · ${c.contactName}${c.city ? ` · ${c.city}` : ''}`,
      href: ws(`/clients/${c.id}`),
      keywords: [c.contactName, c.email ?? '', c.phone ?? '', c.gstin ?? ''].filter(Boolean),
    })),
    ...s.projects.map(({ project: p }) => ({
      id: `project-${p.id}`,
      kind: 'project' as const,
      label: p.name,
      meta: `Project · ${clientName(p.clientId)}`,
      href: ws(`/projects/${p.id}`),
      keywords: [clientName(p.clientId), p.lead],
    })),
    ...s.invoices.map(({ invoice: inv, client, totals, state }) => ({
      id: `invoice-${inv.id}`,
      kind: 'invoice' as const,
      label: inv.number ?? `Draft invoice for ${client.name}`,
      meta: `Invoice · ${client.name} · ${state.statusText}`,
      href: ws(`/invoices/${inv.id}`),
      keywords: [client.name, formatMoney(totals.total.amountMinor, inv.currency)],
    })),
    ...sales
      .filter((i) => i.kind === 'Proposal')
      .map((p) => ({
        id: `proposal-${p.id}`,
        kind: 'proposal' as const,
        label: p.title,
        meta: `Proposal · ${p.status === 'quote' ? 'Quote' : PROPOSAL_STATUS_LABELS[p.status]} · ${formatMoney(p.amountMinor, p.currency)}`,
        href: ws(`/sales/proposals/${p.id}`),
        keywords: [p.number, p.forName],
      })),
    ...s.tasks.map((t) => {
      const project = s.projects.find((p) => p.project.id === t.projectId)?.project;
      return {
        id: `task-${t.id}`,
        kind: 'task' as const,
        label: t.title,
        meta: `Task · ${project?.name ?? ''} · ${t.assignee}`,
        href: ws(`/tasks/${t.id}`),
        keywords: [t.assignee, project?.name ?? ''],
      };
    }),
  ];
}
