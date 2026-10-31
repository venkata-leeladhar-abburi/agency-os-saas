import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { claimPortalAccess, createClient, getClient, invitePortalContact } from '../src/clients';
import {
  createKnowledgeFolder,
  createKnowledgeItem,
  deleteKnowledgeFolder,
  deleteKnowledgeItem,
  getKnowledgeItem,
  knowledgeTags,
  listKnowledgeFolders,
  listKnowledgeItems,
  portalKnowledge,
  updateKnowledgeFolder,
  updateKnowledgeItem,
  type KnowledgeItemInput,
} from '../src/knowledge';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
const p: Record<string, Session> = {};
let ws: string;
let other: string;
let acme: string;
let kite: string;
let folder: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const base: KnowledgeItemInput = {
  folderId: null,
  kind: 'process',
  title: 'Example kickoff checklist',
  body: '# Kickoff\n\n- Agree the goals',
  visibility: 'team',
  status: 'published',
};
const titles = async (s: Session, w = ws) =>
  (await as(s, (tx) => listKnowledgeItems(tx, w))).map((i) => i.title).sort();

beforeAll(async () => {
  t = await createTestDb();
  for (const name of [
    'owner',
    'admin',
    'lead',
    'member',
    'member2',
    'finance',
    'outsider',
    'contact',
  ])
    p[name] = { userId: await t.createUser(`${name}@example.com`), email: `${name}@example.com` };
  ws = await as(p.owner!, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  other = await as(p.outsider!, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'enterprise' where id in (${ws}, ${other})`;
  for (const [name, role] of [
    ['admin', 'admin'],
    ['lead', 'project_lead'],
    ['member', 'member'],
    ['member2', 'member'],
    ['finance', 'finance'],
  ] as const) {
    const { token } = await as(p.owner!, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: p[name]!.email!,
        role,
        invitedBy: p.owner!.userId,
      }),
    );
    await as(p[name]!, (tx) => acceptInvitation(tx, token));
  }
  acme = await as(p.owner!, (tx) =>
    createClient(
      tx,
      ws,
      {
        name: 'Example Acme',
        stateCode: '36',
        contact: { name: 'Example Contact', email: 'contact@example.com' },
      },
      p.owner!.userId,
    ),
  );
  kite = await as(p.owner!, (tx) =>
    createClient(tx, ws, { name: 'Example Kite', stateCode: '36' }, p.owner!.userId),
  );
  const contactId = (await as(p.owner!, (tx) => getClient(tx, acme)))!.contacts[0]!.id;
  await as(p.owner!, (tx) => invitePortalContact(tx, contactId, p.owner!.userId));
  await as(p.contact!, (tx) => claimPortalAccess(tx));
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('knowledge base', () => {
  it('lets those who manage it make folders; members and finance can’t', async () => {
    folder = await as(p.lead!, (tx) =>
      createKnowledgeFolder(tx, ws, { name: '  Example   Onboarding ' }, p.lead!.userId),
    );
    const sub = await as(p.owner!, (tx) =>
      createKnowledgeFolder(
        tx,
        ws,
        { name: 'Example Week one', parentId: folder },
        p.owner!.userId,
      ),
    );
    await expect(
      as(p.member!, (tx) => createKnowledgeFolder(tx, ws, { name: 'Mine' }, p.member!.userId)),
    ).rejects.toThrow();
    await expect(
      as(p.owner!, (tx) => createKnowledgeFolder(tx, ws, { name: ' ' }, p.owner!.userId)),
    ).rejects.toMatchObject({ code: 'knowledge_folder_name_required' });
    // Not inside itself, and not from another workspace.
    await expect(
      as(p.owner!, (tx) =>
        updateKnowledgeFolder(tx, folder, { name: 'Example Onboarding', parentId: sub }),
      ),
    ).rejects.toMatchObject({ code: 'knowledge_folder_parent_invalid' });
    const theirs = await as(p.outsider!, (tx) =>
      createKnowledgeFolder(tx, other, { name: 'Theirs' }, p.outsider!.userId),
    );
    await expect(
      as(p.owner!, (tx) =>
        createKnowledgeFolder(tx, ws, { name: 'X', parentId: theirs }, p.owner!.userId),
      ),
    ).rejects.toThrow();
    const folders = await as(p.member!, (tx) => listKnowledgeFolders(tx, ws));
    expect(folders.map((f) => f.name)).toEqual(['Example Onboarding', 'Example Week one']);
    expect(await as(p.outsider!, (tx) => listKnowledgeFolders(tx, ws))).toEqual([]);
  });

  it('shows each item to exactly the people it’s for', async () => {
    const add = (s: Session, input: Partial<KnowledgeItemInput>) =>
      as(s, (tx) => createKnowledgeItem(tx, ws, { ...base, folderId: folder, ...input }, s.userId));
    await add(p.lead!, { title: 'Example team SOP' });
    await add(p.member!, { title: 'Example my prompt', kind: 'prompt', visibility: 'private' });
    await add(p.owner!, { title: 'Example finance only', roles: ['finance'] });
    await add(p.owner!, { title: 'Example draft', status: 'draft' });
    await add(p.owner!, { title: 'Example for Acme', visibility: 'clients', clientIds: [acme] });
    await add(p.owner!, {
      title: 'Example for every client',
      visibility: 'clients',
      allClients: true,
    });

    const everyoneSees = ['Example for Acme', 'Example for every client', 'Example team SOP'];
    // Those who manage it see everything but others' private items, drafts included.
    expect(await titles(p.owner!)).toEqual(
      [...everyoneSees, 'Example draft', 'Example finance only'].sort(),
    );
    expect(await titles(p.lead!)).toEqual(await titles(p.owner!));
    expect(await titles(p.member!)).toEqual([...everyoneSees, 'Example my prompt'].sort());
    expect(await titles(p.member2!)).toEqual(everyoneSees);
    expect(await titles(p.finance!)).toEqual([...everyoneSees, 'Example finance only'].sort());
    expect(await titles(p.outsider!)).toEqual([]);
    // Opening by its link is the same.
    const [mine] = await as(p.member!, (tx) => listKnowledgeItems(tx, ws, { kind: 'prompt' }));
    expect(await as(p.owner!, (tx) => getKnowledgeItem(tx, mine!.id))).toBeNull();
    expect(await as(p.member!, (tx) => getKnowledgeItem(tx, mine!.id))).toMatchObject({
      item: { title: 'Example my prompt' },
    });
  });

  it('lets members add and change their own items, but not share with clients or edit others’', async () => {
    await expect(
      as(p.member!, (tx) =>
        createKnowledgeItem(
          tx,
          ws,
          { ...base, title: 'Nope', visibility: 'clients', allClients: true },
          p.member!.userId,
        ),
      ),
    ).rejects.toThrow();
    const [sop] = await as(p.member!, (tx) => listKnowledgeItems(tx, ws, { search: 'team sop' }));
    await expect(
      as(p.member!, (tx) =>
        updateKnowledgeItem(tx, sop!.id, { ...base, title: 'Changed' }, p.member!.userId),
      ),
    ).rejects.toMatchObject({ code: 'knowledge_not_found' });
    const [mine] = await as(p.member!, (tx) => listKnowledgeItems(tx, ws, { kind: 'prompt' }));
    await as(p.member!, (tx) =>
      updateKnowledgeItem(
        tx,
        mine!.id,
        {
          ...base,
          kind: 'prompt',
          title: 'Example my prompt',
          visibility: 'team',
          tags: [' AI ', 'ai', 'Cold Email'],
        },
        p.member!.userId,
      ),
    );
    expect(await titles(p.member2!)).toContain('Example my prompt');
    expect(await as(p.member2!, (tx) => knowledgeTags(tx, ws))).toEqual([
      { tag: 'ai', items: 1 },
      { tag: 'cold-email', items: 1 },
    ]);
    // Managers can edit a member's shared item; the author stays the member.
    await as(p.lead!, (tx) =>
      updateKnowledgeItem(
        tx,
        mine!.id,
        { ...base, kind: 'prompt', title: 'Example our prompt' },
        p.lead!.userId,
      ),
    );
    const got = await as(p.owner!, (tx) => getKnowledgeItem(tx, mine!.id));
    expect(got!.item).toMatchObject({ createdBy: p.member!.userId, updatedBy: p.lead!.userId });
  });

  it('checks titles, links and the clients picked', async () => {
    const add = (input: Partial<KnowledgeItemInput>) =>
      as(p.owner!, (tx) => createKnowledgeItem(tx, ws, { ...base, ...input }, p.owner!.userId));
    await expect(add({ title: '  ' })).rejects.toMatchObject({ code: 'knowledge_title_required' });
    await expect(add({ url: 'javascript:alert(1)' })).rejects.toMatchObject({
      code: 'knowledge_url_invalid',
    });
    await expect(add({ visibility: 'clients' })).rejects.toMatchObject({
      code: 'knowledge_clients_required',
    });
    const theirClient = await as(p.outsider!, (tx) =>
      createClient(tx, other, { name: 'Theirs', stateCode: '36' }, p.outsider!.userId),
    );
    await expect(add({ visibility: 'clients', clientIds: [theirClient] })).rejects.toThrow();
  });

  it('shows the client only published items shared with their company', async () => {
    const guides = await as(p.contact!, (tx) => portalKnowledge(tx, acme));
    expect(guides.map((g) => g.title).sort()).toEqual([
      'Example for Acme',
      'Example for every client',
    ]);
    expect(guides[0]).toMatchObject({ folder: 'Example Onboarding', kind: 'process' });
    expect(guides[0]).not.toHaveProperty('createdBy');
    // Another client's guides, or the team's own items, never.
    expect(await as(p.contact!, (tx) => portalKnowledge(tx, kite))).toEqual([]);
    expect(await as(p.contact!, (tx) => listKnowledgeItems(tx, ws))).toEqual([]);
    expect(await as(p.outsider!, (tx) => portalKnowledge(tx, acme))).toEqual([]);
  });

  it('searches, filters and deletes; folders go only when empty', async () => {
    expect(
      (await as(p.owner!, (tx) => listKnowledgeItems(tx, ws, { search: 'goals' }))).length,
    ).toBeGreaterThan(0);
    expect(await as(p.owner!, (tx) => listKnowledgeItems(tx, ws, { search: '%' }))).toEqual([]);
    await expect(as(p.owner!, (tx) => deleteKnowledgeFolder(tx, folder))).rejects.toMatchObject({
      code: 'knowledge_folder_not_empty',
    });
    const [draft] = await as(p.owner!, (tx) =>
      listKnowledgeItems(tx, ws, { search: 'Example draft' }),
    );
    await expect(
      as(p.member2!, (tx) => deleteKnowledgeItem(tx, draft!.id, p.member2!.userId)),
    ).rejects.toMatchObject({
      code: 'knowledge_not_found',
    });
    await as(p.owner!, (tx) => deleteKnowledgeItem(tx, draft!.id, p.owner!.userId));
    expect(await titles(p.owner!)).not.toContain('Example draft');
    expect(await as(p.owner!, (tx) => listKnowledgeFolders(tx, ws))).toContainEqual(
      expect.objectContaining({ name: 'Example Onboarding', items: 4 }),
    );
    // Counts are what each person can see (the finance-only item isn't in member2's).
    expect(await as(p.member2!, (tx) => listKnowledgeFolders(tx, ws))).toContainEqual(
      expect.objectContaining({ name: 'Example Onboarding', items: 3 }),
    );
    const [acmeOnly] = await as(p.owner!, (tx) =>
      listKnowledgeItems(tx, ws, { search: 'for Acme' }),
    );
    expect(acmeOnly).toMatchObject({ clientCount: 1, updatedByName: 'owner' });
  });
});
