// The knowledge base on the database (TEST_DATABASE_URL), through the functions the pages use:
// what an owner and a member each see and may change, and a client's guides in the portal.
import {
  acceptInvitation,
  createClient,
  createWorkspace,
  inviteMember,
  withUser,
  type Session,
} from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import type { KnowledgeInput } from '../knowledge-types';
import {
  deleteKnowledgeItemFor,
  knowledgeFor,
  knowledgeItemFor,
  knowledgeRightsFor,
  saveKnowledgeFolderFor,
  saveKnowledgeItemFor,
  sharingClientsFor,
} from './knowledge';
import { searchFor } from './search';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let owner: WorkspaceCtx;
let member: WorkspaceCtx;
let acme: string;

const input = (over: Partial<KnowledgeInput> = {}): KnowledgeInput => ({
  folderId: null,
  kind: 'process',
  title: 'Example SOP',
  summary: null,
  body: '# Steps',
  url: null,
  tags: [],
  visibility: 'team',
  roles: [],
  allClients: false,
  clientIds: [],
  status: 'published',
  ...over,
});

run('the knowledge base on the database', () => {
  beforeAll(async () => {
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const arjun: Session = {
      userId: await t.createUser('arjun@onestop.in'),
      email: 'arjun@onestop.in',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${kiran.userId}`;
    const { token } = await withUser(t.db, kiran, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: arjun.email!,
        role: 'member',
        invitedBy: kiran.userId,
      }),
    );
    await withUser(t.db, arjun, (tx) => acceptInvitation(tx, token));
    owner = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };
    member = { ...owner, session: arjun, role: 'member' };
    acme = await withUser(t.db, kiran, (tx) =>
      createClient(tx, ws, { name: 'Example Acme Labs', stateCode: '29' }, kiran.userId),
    );
  }, 60_000);

  afterAll(async () => {
    await t?.drop();
  });

  it('gives owners everything and members their own items', async () => {
    expect(knowledgeRightsFor(owner)).toEqual({ add: true, manage: true });
    expect(knowledgeRightsFor(member)).toEqual({ add: true, manage: false });
    expect(knowledgeRightsFor({ ...owner, role: 'finance' })).toEqual({
      add: false,
      manage: false,
    });
  });

  it('lists folders, items and tags, with who may edit each', async () => {
    const folder = await saveKnowledgeFolderFor(owner, {
      name: 'Example Delivery',
      description: null,
      parentId: null,
    });
    const sop = await saveKnowledgeItemFor(owner, input({ folderId: folder, tags: ['QA'] }));
    const shared = await saveKnowledgeItemFor(
      owner,
      input({ title: 'Example guide', visibility: 'clients', clientIds: [acme] }),
    );
    const mine = await saveKnowledgeItemFor(
      member,
      input({ title: 'Example my prompt', kind: 'prompt', visibility: 'private' }),
    );

    const ownerView = await knowledgeFor(owner, {});
    expect(ownerView.items.map((i) => [i.title, i.canEdit]).sort()).toEqual([
      ['Example SOP', true],
      ['Example guide', true],
    ]);
    expect(ownerView.folders).toEqual([
      expect.objectContaining({ name: 'Example Delivery', items: 1 }),
    ]);
    expect(ownerView.tags).toEqual([{ tag: 'qa', items: 1 }]);
    expect(ownerView.total).toBe(2);
    expect(ownerView.items.find((i) => i.id === shared)).toMatchObject({
      clientCount: 1,
      updatedBy: 'Kiran Rao',
    });

    const memberView = await knowledgeFor(member, {});
    expect(memberView.items.map((i) => [i.title, i.canEdit]).sort()).toEqual([
      ['Example SOP', false],
      ['Example guide', false],
      ['Example my prompt', true],
    ]);
    expect(await knowledgeItemFor(owner, mine)).toBeNull();
    expect(await knowledgeItemFor(member, shared)).toMatchObject({
      clientIds: [acme],
      body: '# Steps',
    });
    expect((await knowledgeFor(owner, { folderId: folder })).items.map((i) => i.id)).toEqual([sop]);
    expect(await sharingClientsFor(owner)).toEqual([{ id: acme, name: 'Example Acme Labs' }]);
  });

  it('won’t let a member share with clients or delete the team’s items', async () => {
    await expect(
      saveKnowledgeItemFor(
        member,
        input({ title: 'Nope', visibility: 'clients', allClients: true }),
      ),
    ).rejects.toThrow();
    const [sop] = (await knowledgeFor(member, { search: 'Example SOP' })).items;
    await expect(deleteKnowledgeItemFor(member, sop!.id)).rejects.toMatchObject({
      code: 'knowledge_not_found',
    });
    await deleteKnowledgeItemFor(owner, sop!.id);
    expect((await knowledgeFor(owner, {})).items.map((i) => i.title)).toEqual(['Example guide']);
  });

  it('finds items in the command palette, as each person sees them', async () => {
    const draft = await saveKnowledgeItemFor(
      owner,
      input({
        title: 'Example kickoff checklist',
        kind: 'checklist',
        summary: 'Before the first call',
        tags: ['onboarding'],
        status: 'draft',
      }),
    );
    const knowledge = async (ctx: WorkspaceCtx, words: string) =>
      (await searchFor(ctx, 'one-stop', words)).filter((i) => i.kind === 'knowledge');

    // By title, summary, tag and kind, with the kind (and the folder, when it has one).
    for (const words of ['kickoff', 'first call', 'onboard', 'checklist'])
      expect(await knowledge(owner, words)).toEqual([
        {
          id: `knowledge-${draft}`,
          kind: 'knowledge',
          label: 'Example kickoff checklist',
          meta: 'Knowledge · Checklist',
          href: `/w/one-stop/knowledge/${draft}`,
          keywords: [],
        },
      ]);
    // Drafts only for those who can edit them, private items only for their writer.
    expect(await knowledge(member, 'kickoff')).toEqual([]);
    expect((await knowledge(member, 'my prompt')).map((i) => i.meta)).toEqual([
      'Knowledge · Prompt',
    ]);
    expect(await knowledge(owner, 'my prompt')).toEqual([]);
    // Deleted items aren't found.
    await deleteKnowledgeItemFor(owner, draft);
    expect(await knowledge(owner, 'kickoff')).toEqual([]);
  });
});
