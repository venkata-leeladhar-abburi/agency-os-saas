// Server only. Data export from the database: the CSV lists in the same shapes as example mode,
// and everything as JSON from packages/db. Only roles with data.export may export.
import { canExport, exportWorkspace } from '@agency-os/db';
import type { ExportSource } from '../export';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import { invoiceDetail, invoiceRows } from './invoices';
import { clientList, leadList } from './people';
import { quotesWithTotals } from './sales';
import { teamFor } from './team';
import { projectList, taskList } from './work';

/** The records the CSV files are made from, or null when the member may not export. */
export async function exportSource(ctx: WorkspaceCtx): Promise<ExportSource | null> {
  if (!(await asMember(ctx, (tx) => canExport(tx, ctx.workspaceId)))) return null;
  const [leads, clients, projects, tasks, quotes, rows, team] = await Promise.all([
    leadList(ctx),
    clientList(ctx),
    projectList(ctx),
    taskList(ctx),
    quotesWithTotals(ctx),
    invoiceRows(ctx),
    teamFor(ctx),
  ]);
  const invoices = [];
  for (const row of rows) {
    const found = await invoiceDetail(ctx, row.id);
    if (found)
      invoices.push({
        invoice: found.invoice,
        client: found.client,
        totals: found.totals,
        state: found.state,
      });
  }
  return {
    leads,
    clients: clients.map((c) => c.client),
    projects: projects.map((p) => p.project),
    tasks: tasks.map((t) => t.task),
    quotes,
    invoices,
    members: team.members,
  };
}

/** Every table as JSON (secrets left out; money in minor units, as strings), or null if not allowed. */
export async function exportAll(ctx: WorkspaceCtx): Promise<string | null> {
  if (!(await asMember(ctx, (tx) => canExport(tx, ctx.workspaceId)))) return null;
  const data = await asMember(ctx, (tx) =>
    exportWorkspace(tx, ctx.workspaceId, ctx.session.userId),
  );
  return JSON.stringify(
    {
      ...data,
      note: 'Amounts ending in "_minor" are in the smallest unit of the currency (paise for INR).',
    },
    (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
    2,
  );
}
