// Example data in a real workspace (M7, D-063): a few labelled records to look around with, and
// one call to remove them. Loading runs as the member through the usual create functions;
// removing is one guarded database function (remove_example_data). No example quote or issued
// invoice is made, so the numbering series never has a gap.
import { and, eq, sql } from 'drizzle-orm';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import { createClient } from './clients';
import { createInvoice, localDate } from './invoices';
import { createLead, listStages } from './leads';
import { createProject } from './projects';
import { clients, leads } from './schema';
import { createTask } from './tasks';

const DAY = 86_400_000;

async function canManage(tx: Tx, workspaceId: string) {
  const [row] = await tx.execute<{ ok: boolean }>(
    sql`select has_permission(${workspaceId}::uuid, 'workspace.manage') as ok`,
  );
  return Boolean(row?.ok);
}

/** Whether the workspace has example records loaded. */
export async function hasExampleData(tx: Tx, workspaceId: string) {
  const [lead] = await tx
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.workspaceId, workspaceId), eq(leads.isExample, true)))
    .limit(1);
  const [client] = await tx
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.isExample, true)))
    .limit(1);
  return Boolean(lead || client);
}

/**
 * Loads the example leads, a client with a project and tasks, and a draft invoice, all marked
 * as examples. Owners and admins only; nothing happens if examples are already there.
 */
export async function loadExampleData(
  tx: Tx,
  workspaceId: string,
  actorId: string,
  now = new Date(),
): Promise<number> {
  if (!(await canManage(tx, workspaceId))) throw new AccountError('no_access');
  if (await hasExampleData(tx, workspaceId)) return 0;
  const stages = (await listStages(tx, workspaceId)).filter((s) => s.kind === 'open');
  const stage = (i: number) => stages[Math.min(i, stages.length - 1)]?.id;
  const today = localDate(now, 'Asia/Kolkata');
  const at = (days: number, hour = 11) =>
    new Date(
      new Date(`${today}T${String(hour).padStart(2, '0')}:00:00+05:30`).getTime() + days * DAY,
    );
  const on = (days: number) => localDate(new Date(now.getTime() + days * DAY), 'Asia/Kolkata');
  let added = 0;

  const examples = [
    ['Kiran Kumar', 'Kite & Co', 'kiran@kite.example', 0, 8_000_000n, 'instagram', 'Website', 0],
    [
      'Lakshmi Iyer',
      'Lumen Foods',
      'lakshmi@lumen.example',
      0,
      15_000_000n,
      'referral',
      'Brand identity',
      -2,
    ],
    ['Dr Rao', 'Mitra Clinic', 'rao@mitra.example', 1, 6_000_000n, 'website', 'Web app or SaaS', 3],
    [
      'Sarah Lewis',
      'Northwind',
      'sarah@northwind.example',
      2,
      24_000_000n,
      'marketplace',
      'Mobile app',
      4,
    ],
  ] as const;
  for (const [name, company, email, s, valueMinor, source, service, followUp] of examples) {
    await createLead(
      tx,
      workspaceId,
      {
        name,
        company,
        email,
        stageId: stage(s),
        valueMinor,
        source,
        service,
        ownerId: actorId,
        nextFollowUpAt: at(followUp),
        isExample: true,
      },
      actorId,
      { now, enforceLimit: false },
    );
    added++;
  }

  const clientId = await createClient(
    tx,
    workspaceId,
    {
      name: 'Acme Labs',
      stateCode: '29',
      billingAddress: { city: 'Bengaluru' },
      contact: { name: 'Srinivas Beere', email: 'srinivas@acme.example' },
      isExample: true,
    },
    actorId,
  );
  added++;
  const projectId = await createProject(
    tx,
    workspaceId,
    { clientId, name: 'Website redesign', leadMemberId: actorId, isExample: true },
    actorId,
  );
  added++;
  for (const [title, status, due] of [
    ['Wireframes for key pages', 'done', -6],
    ['Homepage hero copy', 'in_progress', 4],
    ['Prepare staging', 'todo', 3],
  ] as const) {
    await createTask(
      tx,
      workspaceId,
      { projectId, title, status, dueOn: on(due), assigneeId: actorId, isExample: true },
      actorId,
    );
    added++;
  }
  // A draft: example invoices are never issued, so they never take a number.
  await createInvoice(
    tx,
    workspaceId,
    {
      clientId,
      projectId,
      dueOn: on(15),
      items: [
        {
          description: 'Website design, first milestone',
          sacCode: '998314',
          quantity: 1,
          rateMinor: 4_000_000n,
          taxRateBp: 1800,
        },
      ],
      isExample: true,
    },
    actorId,
    now,
  );
  added++;
  return added;
}

/** Removes the example records; ones your own records use stay, by name. Owners and admins. */
export async function removeExampleData(
  tx: Tx,
  workspaceId: string,
): Promise<{ removed: number; kept: string[] }> {
  const [row] = await call(() =>
    tx.execute<{ r: { removed: number; kept: string[] } }>(
      sql`select remove_example_data(${workspaceId}::uuid) as r`,
    ),
  );
  return row!.r;
}
