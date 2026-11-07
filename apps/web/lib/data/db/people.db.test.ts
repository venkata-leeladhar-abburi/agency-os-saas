// Runs the lead and client screens' data functions against a real Postgres (TEST_DATABASE_URL),
// as a member, with RLS: the same path the pages take once signed in.
import { createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import {
  addLeadNoteFor,
  clientDetail,
  clientList,
  createClientFor,
  createLeadFor,
  inviteToPortalFor,
  leadDetail,
  leadList,
  markLeadLostFor,
  moveLeadFor,
  setLeadFollowUpFor,
  winLeadFor,
} from './people';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let ctx: WorkspaceCtx;
let other: WorkspaceCtx;
const lead = {
  name: 'Example Meera Iyer',
  company: 'Example Kite & Co',
  email: 'meera@kite.example',
  phone: null,
  source: 'referral' as const,
  service: 'Website',
  valueMinor: 18_000_000n,
  followUpOn: '2026-10-29',
  notes: '',
};

run('leads and clients on the database', () => {
  beforeAll(async () => {
    t = await createTestDb();
    const owner: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const outsider: Session = {
      userId: await t.createUser('sarah@northwind.example'),
      email: 'sarah@northwind.example',
    };
    const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
    const ws = await as(owner, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    const ws2 = await as(outsider, (tx) =>
      createWorkspace(tx, { name: 'Northwind', slug: 'northwind' }),
    );
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${owner.userId}`;
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    ctx = {
      db: t.db,
      session: owner,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };
    other = {
      db: t.db,
      session: outsider,
      workspaceId: ws2,
      slug: 'northwind',
      role: 'owner',
      plan: 'free',
    };
  }, 60_000);

  afterAll(async () => {
    await t?.drop();
  });

  it('adds a lead and shows it on the board in New, with its owner and follow-up', async () => {
    const id = await createLeadFor(ctx, lead);
    const [row] = await leadList(ctx);
    expect(row).toMatchObject({
      id,
      name: 'Example Meera Iyer',
      company: 'Example Kite & Co',
      stage: 'new',
      valueMinor: 18_000_000n,
      owner: 'Kiran Rao',
      followUpAt: '2026-10-29T05:30:00.000Z',
    });
  });

  it('moves the lead, adds a note and a follow-up, and shows them on its timeline', async () => {
    const id = (await leadList(ctx))[0]!.id;
    await moveLeadFor(ctx, id, 'proposal');
    await addLeadNoteFor(ctx, id, 'Wants the site live before Diwali');
    await setLeadFollowUpFor(ctx, id, null);
    const found = (await leadDetail(ctx, id))!;
    expect(found).toMatchObject({ stage: 'proposal', followUpAt: null });
    expect(found.activities.map((a) => [a.kind, a.who, a.text])).toEqual([
      ['note', 'Kiran Rao', 'Wants the site live before Diwali'],
      ['stage', 'Kiran Rao', 'moved it to Proposal'],
      ['created', 'Kiran Rao', 'added the lead'],
    ]);
  });

  it('marks a lead lost with the reason, and won makes it a client once', async () => {
    const lost = await createLeadFor(ctx, { ...lead, name: 'Example Lumen Foods', company: null });
    await markLeadLostFor(ctx, lost, 'price', 'Went with a cheaper quote');
    expect(await leadDetail(ctx, lost)).toMatchObject({ stage: 'lost', lostReason: 'price' });
    expect((await leadDetail(ctx, lost))!.activities[0]).toMatchObject({
      kind: 'lost',
      text: 'marked it lost: Went with a cheaper quote',
    });

    const won = (await leadList(ctx)).find((l) => l.company === 'Example Kite & Co')!.id;
    const clientId = await winLeadFor(ctx, won);
    expect(await winLeadFor(ctx, won)).toBe(clientId);
    expect(await leadDetail(ctx, won)).toMatchObject({ stage: 'won', clientId, followUpAt: null });
    const client = (await clientDetail(ctx, clientId))!;
    expect(client.client).toMatchObject({
      name: 'Example Kite & Co',
      contactName: 'Example Meera Iyer',
      email: 'meera@kite.example',
      portal: 'not_invited',
    });
  });

  it('adds a client with a GSTIN, lists it with its money, and invites it to the portal', async () => {
    const id = await createClientFor(ctx, {
      name: 'Example Acme Labs',
      contactName: 'Example Srinivas',
      email: 'srinivas@acme.example',
      phone: null,
      city: 'Bengaluru',
      country: 'IN',
      currency: 'INR',
      gstin: '29ABCDE1234F1ZW',
      stateCode: null,
      notes: '',
    });
    const row = (await clientList(ctx)).find((c) => c.client.id === id)!;
    expect(row.client).toMatchObject({ city: 'Bengaluru', stateCode: '29', currency: 'INR' });
    expect(row.money).toEqual({ billed: 0n, outstanding: 0n, drafts: 0n });
    expect(row.projects).toBe(0);
    await inviteToPortalFor(ctx, id);
    const found = (await clientDetail(ctx, id))!;
    expect(found.client.portal).toBe('invited');
    expect(found.client.activities.map((a) => a.text)).toEqual([
      'invited srinivas@acme.example to the portal',
      'added the client',
    ]);
  });

  it('turns a bad GSTIN into a message the form can show', async () => {
    await expect(
      createClientFor(ctx, {
        name: 'Example Bad',
        contactName: 'Example Person',
        email: null,
        phone: null,
        city: null,
        country: 'IN',
        currency: 'INR',
        gstin: '29ABCDE1234F1ZX',
        stateCode: null,
        notes: '',
      }),
    ).rejects.toThrow(/GSTIN/);
  });

  it('shows none of it to another workspace', async () => {
    const id = (await leadList(ctx))[0]!.id;
    const clientId = (await clientList(ctx))[0]!.client.id;
    expect(await leadList(other)).toEqual([]);
    expect(await leadDetail(other, id)).toBeNull();
    expect(await clientList(other)).toEqual([]);
    expect(await clientDetail(other, clientId)).toBeNull();
    await expect(moveLeadFor(other, id, 'won')).rejects.toThrow();
  });
});
