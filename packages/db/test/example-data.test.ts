import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { createClient } from '../src/clients';
import { hasExampleData, loadExampleData, removeExampleData } from '../src/example-data';
import { createInvoice, issueInvoice } from '../src/invoices';
import { createTask } from '../src/tasks';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let member: Session;
let ws: string;

const SECRET = randomBytes(32).toString('hex');
const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const count = async (table: string) =>
  Number(
    (
      await t.admin.unsafe(
        `select count(*)::int as n from ${table} where workspace_id = $1 and is_example`,
        [ws],
      )
    )[0]!.n,
  );
const item = {
  description: 'Design',
  sacCode: '998314',
  quantity: 1,
  rateMinor: 1_000_000n,
  taxRateBp: 1800,
};

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  member = { userId: await t.createUser('arjun@onestop.in'), email: 'arjun@onestop.in' };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set plan = 'growth', gstin = '36AAACO1234A1Z5', state_code = '36',
    invoice_prefix = 'OSS' where id = ${ws}`;
  const { token } = await as(owner, (tx) =>
    inviteMember(tx, {
      workspaceId: ws,
      email: member.email!,
      role: 'member',
      invitedBy: owner.userId,
    }),
  );
  await as(member, (tx) => acceptInvitation(tx, token));
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('example data in a real workspace', () => {
  it('loads labelled leads, a client, a project with tasks and a draft invoice, once', async () => {
    await expect(as(member, (tx) => loadExampleData(tx, ws, member.userId))).rejects.toMatchObject({
      code: 'no_access',
    });
    expect(await as(owner, (tx) => loadExampleData(tx, ws, owner.userId))).toBe(10);
    expect(await as(owner, (tx) => loadExampleData(tx, ws, owner.userId))).toBe(0);
    expect(await as(owner, (tx) => hasExampleData(tx, ws))).toBe(true);
    expect(await count('leads')).toBe(4);
    expect(await count('clients')).toBe(1);
    expect(await count('projects')).toBe(1);
    expect(await count('phases')).toBe(7);
    expect(await count('tasks')).toBe(3);
    expect(await count('invoices')).toBe(1);
    const [inv] = await t.admin`select status, number from invoices where workspace_id = ${ws}`;
    expect(inv).toMatchObject({ status: 'draft', number: null });
  });

  it('never issues an example invoice, so the series has no gap', async () => {
    const [inv] = await t.admin`select id from invoices where workspace_id = ${ws} and is_example`;
    await expect(
      as(owner, (tx) => issueInvoice(tx, inv!.id, owner.userId, { secret: SECRET })),
    ).rejects.toMatchObject({ code: 'example_invoice_draft' });
    await expect(
      t.admin`update invoices set status = 'issued', number = 'OSS/26-27/999' where id = ${inv!.id}`,
    ).rejects.toThrow(/example_invoice_draft/);
  });

  it('removes the examples, keeping the ones your own records use, by name', async () => {
    // Your own task on the example project, and your own invoice for the example client.
    const [project] =
      await t.admin`select id from projects where workspace_id = ${ws} and is_example`;
    const [client] =
      await t.admin`select id from clients where workspace_id = ${ws} and is_example`;
    await as(owner, (tx) =>
      createTask(tx, ws, { projectId: project!.id, title: 'My own task' }, owner.userId),
    );
    const mine = await as(owner, (tx) =>
      createInvoice(
        tx,
        ws,
        { clientId: client!.id, dueOn: '2026-12-01', items: [item] },
        owner.userId,
      ),
    );
    await expect(as(member, (tx) => removeExampleData(tx, ws))).rejects.toMatchObject({
      code: 'no_access',
    });
    const result = await as(owner, (tx) => removeExampleData(tx, ws));
    expect(result.kept.sort()).toEqual(['the client Acme Labs', 'the project Website redesign']);
    expect(result.removed).toBe(4 + 3 + 1); // leads, example tasks, the draft invoice
    expect(await count('leads')).toBe(0);
    expect(await count('tasks')).toBe(0);
    expect(await count('invoices')).toBe(0);
    expect(await count('activities')).toBe(0);
    const [own] = await t.admin`select id from invoices where id = ${mine}`;
    expect(own).toBeTruthy();
    const [logged] =
      await t.admin`select changes from audit_log where workspace_id = ${ws} and action = 'example.removed'`;
    expect(logged!.changes).toMatchObject({ removed: 8 });
  });

  it('removes everything once nothing of yours uses it, and your first invoice is number 1', async () => {
    await t.admin`delete from tasks where workspace_id = ${ws} and title = 'My own task'`;
    await t.admin`delete from invoices where workspace_id = ${ws} and not is_example`;
    const result = await as(owner, (tx) => removeExampleData(tx, ws));
    expect(result).toEqual({ removed: 2, kept: [] });
    expect(await as(owner, (tx) => hasExampleData(tx, ws))).toBe(false);
    const clientId = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example Real Client', stateCode: '36' }, owner.userId),
    );
    const id = await as(owner, (tx) =>
      createInvoice(tx, ws, { clientId, dueOn: '2026-12-01', items: [item] }, owner.userId),
    );
    const { number } = await as(owner, (tx) =>
      issueInvoice(tx, id, owner.userId, { secret: SECRET }),
    );
    expect(number).toMatch(/^OSS\/\d\d-\d\d\/001$/);
  });
});
