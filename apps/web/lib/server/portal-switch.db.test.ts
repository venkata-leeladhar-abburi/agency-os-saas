// A contact for two of an agency's clients (TEST_DATABASE_URL): they see one at a time, can
// choose the other, and can't choose a client that isn't theirs.
import { createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClientFor, inviteToPortalFor } from '../data/db/people';
import { portalCtxFor } from './portal';
import type { WorkspaceCtx } from './workspace';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let sarah: Session;
let first: string;
let second: string;
let notHers: string;

const client = (name: string, email: string) => ({
  name,
  contactName: 'Example Sarah',
  email,
  phone: null,
  city: null,
  country: 'IN',
  currency: 'INR',
  gstin: null,
  stateCode: '29',
  notes: '',
});

run('switching between clients in the portal', () => {
  beforeAll(async () => {
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    sarah = {
      userId: await t.createUser('sarah@northwind.example'),
      email: 'sarah@northwind.example',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    const ctx: WorkspaceCtx = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };
    first = await createClientFor(ctx, client('Example Northwind', 'sarah@northwind.example'));
    second = await createClientFor(
      ctx,
      client('Example Northwind Labs', 'sarah@northwind.example'),
    );
    notHers = await createClientFor(ctx, client('Example Acme', 'srinivas@acme.example'));
    for (const id of [first, second, notHers]) await inviteToPortalFor(ctx, id);
  }, 60_000);

  afterAll(async () => {
    await t?.drop();
  });

  it('lists both of her companies and opens the one she chooses', async () => {
    const pc = (await portalCtxFor(t.db, sarah, 'one-stop'))!;
    expect(pc.choices.map((c) => c.name).sort()).toEqual([
      'Example Northwind',
      'Example Northwind Labs',
    ]);
    expect((await portalCtxFor(t.db, sarah, 'one-stop', second))!.clientId).toBe(second);
    expect((await portalCtxFor(t.db, sarah, 'one-stop', first))!.clientId).toBe(first);
  });

  it('never opens a client she is not a contact for', async () => {
    const pc = (await portalCtxFor(t.db, sarah, 'one-stop', notHers))!;
    expect(pc.clientId).not.toBe(notHers);
    expect(pc.choices.map((c) => c.id)).not.toContain(notHers);
  });
});
