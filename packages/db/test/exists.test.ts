// The check behind a real 404 on a missing record's page (D-073): what the member can see,
// nothing from another workspace, nothing deleted, and nobody else's private knowledge.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { createClient } from '../src/clients';
import { recordVisible } from '../src/exists';
import { createKnowledgeFolder, createKnowledgeItem } from '../src/knowledge';
import { createLead, deleteLead } from '../src/leads';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let member: Session;
let outsider: Session;
let ws: string;
let other: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  member = { userId: await t.createUser('arjun@onestop.in'), email: 'arjun@onestop.in' };
  outsider = { userId: await t.createUser('meera@kite.in'), email: 'meera@kite.in' };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  other = await as(outsider, (tx) => createWorkspace(tx, { name: 'Kite Studio' }));
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

describe('whether a record is there for its page', () => {
  it('finds your workspace’s records, and not another’s or a deleted one', async () => {
    const lead = await as(owner, (tx) =>
      createLead(
        tx,
        ws,
        { name: 'Example Lakshmi Iyer', email: 'lakshmi@lumen.example' },
        owner.userId,
      ),
    );
    const client = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example Acme Labs', stateCode: '29' }, owner.userId),
    );
    expect(await as(owner, (tx) => recordVisible(tx, ws, 'lead', lead))).toBe(true);
    expect(await as(owner, (tx) => recordVisible(tx, ws, 'client', client))).toBe(true);
    // RLS decides: a member sees only the clients of their projects, as on the client's page.
    expect(await as(member, (tx) => recordVisible(tx, ws, 'client', client))).toBe(false);
    // The wrong kind, another workspace, someone outside it, an id that isn't one.
    expect(await as(owner, (tx) => recordVisible(tx, ws, 'client', lead))).toBe(false);
    expect(await as(owner, (tx) => recordVisible(tx, other, 'lead', lead))).toBe(false);
    expect(await as(outsider, (tx) => recordVisible(tx, ws, 'lead', lead))).toBe(false);
    expect(await as(owner, (tx) => recordVisible(tx, ws, 'lead', 'nope'))).toBe(false);
    await as(owner, (tx) => deleteLead(tx, lead));
    expect(await as(owner, (tx) => recordVisible(tx, ws, 'lead', lead))).toBe(false);
  });

  it('keeps private knowledge to its writer, and finds folders', async () => {
    const folder = await as(owner, (tx) =>
      createKnowledgeFolder(tx, ws, { name: 'Example Delivery' }, owner.userId),
    );
    const mine = await as(member, (tx) =>
      createKnowledgeItem(
        tx,
        ws,
        {
          folderId: folder,
          kind: 'prompt',
          title: 'Example my prompt',
          visibility: 'private',
          status: 'published',
        },
        member.userId,
      ),
    );
    expect(await as(member, (tx) => recordVisible(tx, ws, 'knowledge', mine))).toBe(true);
    expect(await as(owner, (tx) => recordVisible(tx, ws, 'knowledge', mine))).toBe(false);
    expect(await as(member, (tx) => recordVisible(tx, ws, 'knowledge-folder', folder))).toBe(true);
    expect(await as(outsider, (tx) => recordVisible(tx, ws, 'knowledge-folder', folder))).toBe(
      false,
    );
  });
});
