// Server only. The workspace as the member can see it, in the screens' shapes, for the pages that
// read across every area at once: the dashboard, Today and the data export. RLS decides what's in it.
import type { InvoiceTotals } from '@agency-os/core';
import type { WorkspaceCtx } from '../../server/workspace';
import type { Client, Invoice, Lead, Member, Project, Quote, Task } from '../types';
import type { InvoiceState } from '../views';
import { invoiceDetail, invoiceRows } from './invoices';
import { clientList, leadList } from './people';
import { quotesWithTotals } from './sales';
import { teamFor } from './team';
import { myName, projectList, taskList } from './work';

export type Snapshot = {
  leads: Lead[];
  clients: Client[];
  /** With how many of each project's open tasks are past their due date. */
  projects: { project: Project; late: number }[];
  tasks: Task[];
  quotes: { quote: Quote; totals: InvoiceTotals }[];
  invoices: {
    invoice: Invoice;
    client: Client;
    totals: InvoiceTotals;
    state: InvoiceState;
    cancelled: boolean;
  }[];
  /** Ids are user ids, so links like "this person's tasks" work. */
  members: (Member & { userId: string })[];
  me: string;
};

export async function snapshot(ctx: WorkspaceCtx, now = new Date()): Promise<Snapshot> {
  const [leads, clients, projects, tasks, quotes, rows, team, me] = await Promise.all([
    leadList(ctx),
    clientList(ctx),
    projectList(ctx, now),
    taskList(ctx),
    quotesWithTotals(ctx),
    invoiceRows(ctx, now),
    teamFor(ctx, now),
    myName(ctx),
  ]);
  const invoices: Snapshot['invoices'] = [];
  for (const row of rows) {
    const found = await invoiceDetail(ctx, row.id, now);
    if (found)
      invoices.push({
        invoice: found.invoice,
        client: found.client,
        totals: found.totals,
        state: found.state,
        cancelled: row.statusText === 'Cancelled',
      });
  }
  return {
    leads,
    clients: clients.map((c) => c.client),
    projects: projects.map((p) => ({ project: p.project, late: p.late })),
    tasks: tasks.map((t) => t.task),
    quotes,
    invoices,
    members: team.members,
    me,
  };
}
