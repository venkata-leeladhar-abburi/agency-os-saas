// The faster read policies (D-069, migration 0026) must show each role exactly the rows the old
// per-row checks did. For every role and table this compares what the member sees through RLS
// with what the old check allows, worked out as the superuser with the member's claims.
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { createClient } from '../src/clients';
import { createInvoice } from '../src/invoices';
import { createLead } from '../src/leads';
import { createProject } from '../src/projects';
import { createProposal, createQuote } from '../src/sales-docs';
import { createTask } from '../src/tasks';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
const people: Record<string, Session> = {};
let ws: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);

/** The policies as they were before migration 0026, to put back inside a rolled-back transaction. */
const OLD_POLICIES = [
  `alter policy leads_select on leads using (has_permission(workspace_id, 'leads.read'))`,
  `alter policy proposals_select on proposals using (has_permission(workspace_id, 'sales_docs.read'))`,
  `alter policy quotes_select on quotes using (has_permission(workspace_id, 'sales_docs.read'))`,
  `alter policy quote_items_select on quote_items using (has_permission(workspace_id, 'sales_docs.read'))`,
  `alter policy audit_log_select on audit_log using (has_permission(workspace_id, 'audit.read'))`,
  `alter policy clients_select on clients using (can_read_client(workspace_id, id))`,
  `alter policy client_contacts_select on client_contacts using (can_read_client(workspace_id, client_id))`,
  `alter policy projects_select on projects using (can_project(workspace_id, id, 'projects.read'))`,
  `alter policy phases_select on phases using (can_project(workspace_id, project_id, 'projects.read'))`,
  `alter policy tasks_select on tasks using (can_see_task(workspace_id, project_id, assignee_id))`,
  `alter policy invoices_select on invoices using (can_invoice(workspace_id, project_id, 'invoices.read'))`,
  `alter policy activities_select on activities using (is_member(workspace_id) and activity_visible(workspace_id, subject_type, subject_id))`,
  `alter policy comments_select on comments using (is_member(workspace_id) and activity_visible(workspace_id, subject_type, subject_id))`,
  `alter policy pipeline_stages_select on pipeline_stages using (is_member(workspace_id))`,
  `alter policy notifications_select on notifications using (user_id = auth.uid() and is_member(workspace_id))`,
  `alter policy checklist_items_select on checklist_items using (can_project(workspace_id, project_of_phase(phase_id), 'projects.read'))`,
  `alter policy gates_select on gates using (can_project(workspace_id, project_of_phase(phase_id), 'projects.read'))`,
  `alter policy project_members_select on project_members using (can_project(workspace_id, project_id, 'projects.read'))`,
  `alter policy phases_write on phases using (can_project(workspace_id, project_id, 'projects.write')) with check (can_project(workspace_id, project_id, 'projects.write'))`,
  `alter policy project_members_write on project_members using (can_project(workspace_id, project_id, 'projects.write')) with check (can_project(workspace_id, project_id, 'projects.write'))`,
  `alter policy checklist_items_write on checklist_items using (can_project(workspace_id, project_of_phase(phase_id), 'projects.write')) with check (can_project(workspace_id, project_of_phase(phase_id), 'projects.write'))`,
  `alter policy gates_write on gates using (can_project(workspace_id, project_of_phase(phase_id), 'projects.write')) with check (can_project(workspace_id, project_of_phase(phase_id), 'projects.write'))`,
  `alter policy client_contacts_write on client_contacts using (has_permission(workspace_id, 'clients.write')) with check (has_permission(workspace_id, 'clients.write'))`,
  `alter policy invoice_items_write on invoice_items using (has_permission(workspace_id, 'invoices.write')) with check (has_permission(workspace_id, 'invoices.write'))`,
  `alter policy proposals_write on proposals using (has_permission(workspace_id, 'sales_docs.write')) with check (has_permission(workspace_id, 'sales_docs.write'))`,
  `alter policy quotes_write on quotes using (has_permission(workspace_id, 'sales_docs.write')) with check (has_permission(workspace_id, 'sales_docs.write'))`,
  `alter policy quote_items_write on quote_items using (has_permission(workspace_id, 'sales_docs.write')) with check (has_permission(workspace_id, 'sales_docs.write'))`,
  `alter policy enquiry_forms_write on enquiry_forms using (has_permission(workspace_id, 'leads.write')) with check (has_permission(workspace_id, 'leads.write'))`,
];

/** Every table whose policies changed. */
const TABLES = [
  'leads',
  'proposals',
  'quotes',
  'quote_items',
  'audit_log',
  'enquiry_forms',
  'clients',
  'client_contacts',
  'projects',
  'phases',
  'project_members',
  'checklist_items',
  'gates',
  'tasks',
  'invoices',
  'invoice_items',
  'activities',
  'comments',
  'pipeline_stages',
  'notifications',
];

class Rollback extends Error {
  constructor(public seen: Record<string, string[]>) {
    super('rollback');
  }
}

/** What a person saw under the old policies: put back, read as them, rolled back. */
async function seenBefore(s: Session): Promise<Record<string, string[]>> {
  const claims = JSON.stringify({ sub: s.userId, role: 'authenticated' });
  try {
    await t.admin.begin(async (q) => {
      for (const statement of OLD_POLICIES) await q.unsafe(statement);
      await q`select set_config('request.jwt.claims', ${claims}, true)`;
      await q.unsafe('set local role authenticated');
      const seen: Record<string, string[]> = {};
      for (const table of TABLES)
        seen[table] = (
          await q.unsafe<{ id: string }[]>(`select id::text from ${table} order by id`)
        ).map((r) => r.id);
      throw new Rollback(seen);
    });
  } catch (error) {
    if (error instanceof Rollback) return error.seen;
    throw error;
  }
  throw new Error('unreachable');
}

beforeAll(async () => {
  t = await createTestDb();
  for (const name of ['owner', 'admin', 'lead', 'member', 'assignee', 'finance', 'hr', 'outsider'])
    people[name] = {
      userId: await t.createUser(`${name}@example.com`),
      email: `${name}@example.com`,
    };
  const { owner, lead, member, assignee, outsider } = people as Record<string, Session>;
  ws = await as(owner!, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  const other = await as(outsider!, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'enterprise', gstin = '36AAACO1234A1Z5', state_code = '36' where id in (${ws}, ${other})`;
  for (const [name, role] of [
    ['admin', 'admin'],
    ['lead', 'project_lead'],
    ['member', 'member'],
    ['assignee', 'member'],
    ['finance', 'finance'],
    ['hr', 'hr'],
  ] as const) {
    const { token } = await as(owner!, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: people[name]!.email!,
        role,
        invitedBy: owner!.userId,
      }),
    );
    await as(people[name]!, (tx) => acceptInvitation(tx, token));
  }
  const item = {
    description: 'Design',
    sacCode: '998314',
    quantity: 1,
    rateMinor: 1_000_000n,
    taxRateBp: 1800,
  };
  for (const [s, w] of [
    [owner!, ws],
    [outsider!, other],
  ] as const) {
    await as(s, async (tx) => {
      const leadId = await createLead(
        tx,
        w,
        { name: 'Example Lead', email: 'lead@example.com' },
        s.userId,
      );
      const quoteId = await createQuote(tx, w, { leadId, items: [item] }, s.userId);
      await createProposal(tx, w, { quoteId }, s.userId);
      const a = await createClient(
        tx,
        w,
        {
          name: 'Example A',
          stateCode: '36',
          contact: { name: 'Example Contact A', email: 'a@example.com' },
        },
        s.userId,
      );
      const b = await createClient(tx, w, { name: 'Example B', stateCode: '36' }, s.userId);
      await createClient(tx, w, { name: 'Example C', stateCode: '36' }, s.userId);
      const onTeam = w === ws ? { leadMemberId: lead!.userId, memberIds: [member!.userId] } : {};
      const pa = await createProject(
        tx,
        w,
        { clientId: a, name: 'Example Project A', ...onTeam },
        s.userId,
      );
      const pb = await createProject(tx, w, { clientId: b, name: 'Example Project B' }, s.userId);
      await createTask(tx, w, { projectId: pa, title: 'Example task on A' }, s.userId);
      await createTask(
        tx,
        w,
        {
          projectId: pb,
          title: 'Example task on B',
          assigneeId: w === ws ? assignee!.userId : undefined,
        },
        s.userId,
      );
      for (const projectId of [pa, pb, null])
        await createInvoice(
          tx,
          w,
          { clientId: a, projectId, dueOn: '2026-12-01', items: [item] },
          s.userId,
        );
    });
  }
}, 120_000);

afterAll(async () => {
  await t?.drop();
});

describe('faster read policies', () => {
  for (const name of ['owner', 'admin', 'lead', 'member', 'assignee', 'finance', 'hr', 'outsider'])
    it(`show ${name} exactly what the old checks did`, async () => {
      const s = people[name]!;
      const before = await seenBefore(s);
      for (const table of TABLES) {
        const now = await as(s, (tx) =>
          // Table names come from the list above, not from input.
          tx.execute<{ id: string }>(sql.raw(`select id::text from ${table} order by id`)),
        );
        expect(
          now.map((r) => r.id),
          `${name} on ${table}`,
        ).toEqual(before[table]);
      }
    });

  it('has rows to compare: each role sees something different', async () => {
    const counts = await Promise.all(
      ['owner', 'lead', 'member', 'assignee', 'finance'].map((name) =>
        as(people[name]!, async (tx) =>
          [
            (await tx.execute(sql.raw('select 1 from projects'))).length,
            (await tx.execute(sql.raw('select 1 from tasks'))).length,
            (await tx.execute(sql.raw('select 1 from invoices'))).length,
            (await tx.execute(sql.raw('select 1 from clients'))).length,
          ].join(','),
        ),
      ),
    );
    expect(new Set(counts).size).toBeGreaterThan(2);
  });
});
