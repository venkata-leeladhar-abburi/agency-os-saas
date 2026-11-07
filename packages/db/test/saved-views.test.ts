import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { deleteSavedView, listSavedViews, MAX_SAVED_VIEWS, saveView } from '../src/saved-views';
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
  outsider = { userId: await t.createUser('meera@other.in'), email: 'meera@other.in' };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  other = await as(outsider, (tx) => createWorkspace(tx, { name: 'Other Studio' }));
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

describe('saved views', () => {
  it('saves, lists by name and replaces a view saved under the same name', async () => {
    const a = await as(owner, (tx) =>
      saveView(tx, ws, owner.userId, {
        area: 'leads',
        name: ' Referrals  due ',
        query: 'source=referral&due=1',
      }),
    );
    await as(owner, (tx) =>
      saveView(tx, ws, owner.userId, {
        area: 'leads',
        name: 'Arjun’s leads',
        query: 'owner=Arjun',
      }),
    );
    const again = await as(owner, (tx) =>
      saveView(tx, ws, owner.userId, {
        area: 'leads',
        name: 'Referrals due',
        query: 'source=referral',
      }),
    );
    expect(again).toBe(a);
    expect(await as(owner, (tx) => listSavedViews(tx, ws, owner.userId, 'leads'))).toEqual([
      { id: expect.any(String), name: 'Arjun’s leads', query: 'owner=Arjun' },
      { id: a, name: 'Referrals due', query: 'source=referral' },
    ]);
  });

  it('asks for a short name', async () => {
    await expect(
      as(owner, (tx) => saveView(tx, ws, owner.userId, { area: 'leads', name: '  ', query: '' })),
    ).rejects.toMatchObject({ code: 'view_name_required' });
    await expect(
      as(owner, (tx) =>
        saveView(tx, ws, owner.userId, { area: 'leads', name: 'x'.repeat(61), query: '' }),
      ),
    ).rejects.toMatchObject({ code: 'view_name_too_long' });
  });

  it('keeps each member’s views to themselves', async () => {
    expect(await as(member, (tx) => listSavedViews(tx, ws, member.userId, 'leads'))).toEqual([]);
    // Asking for someone else's views, or writing one as them, finds nothing and is refused.
    expect(await as(member, (tx) => listSavedViews(tx, ws, owner.userId, 'leads'))).toEqual([]);
    await expect(
      as(member, (tx) =>
        saveView(tx, ws, owner.userId, { area: 'leads', name: 'Sneaky', query: '' }),
      ),
    ).rejects.toThrow();
    const [view] = await as(owner, (tx) => listSavedViews(tx, ws, owner.userId, 'leads'));
    expect(await as(member, (tx) => deleteSavedView(tx, ws, view!.id))).toBe(false);
    expect(await as(owner, (tx) => listSavedViews(tx, ws, owner.userId, 'leads'))).toHaveLength(2);
  });

  it('never crosses workspaces', async () => {
    expect(await as(outsider, (tx) => listSavedViews(tx, ws, owner.userId, 'leads'))).toEqual([]);
    await expect(
      as(outsider, (tx) =>
        saveView(tx, ws, outsider.userId, { area: 'leads', name: 'Mine', query: '' }),
      ),
    ).rejects.toThrow();
    const [view] = await as(owner, (tx) => listSavedViews(tx, ws, owner.userId, 'leads'));
    expect(await as(outsider, (tx) => deleteSavedView(tx, other, view!.id))).toBe(false);
    expect(await as(outsider, (tx) => deleteSavedView(tx, ws, view!.id))).toBe(false);
  });

  it(`keeps up to ${MAX_SAVED_VIEWS} views, and deletes`, async () => {
    for (let i = 0; i < MAX_SAVED_VIEWS; i++)
      await as(member, (tx) =>
        saveView(tx, ws, member.userId, { area: 'leads', name: `View ${i}`, query: `owner=${i}` }),
      );
    await expect(
      as(member, (tx) =>
        saveView(tx, ws, member.userId, { area: 'leads', name: 'One more', query: '' }),
      ),
    ).rejects.toMatchObject({ code: 'too_many_views' });
    // Replacing one you have is still fine at the limit.
    await as(member, (tx) =>
      saveView(tx, ws, member.userId, { area: 'leads', name: 'View 3', query: 'due=1' }),
    );
    const [first] = await as(member, (tx) => listSavedViews(tx, ws, member.userId, 'leads'));
    expect(await as(member, (tx) => deleteSavedView(tx, ws, first!.id))).toBe(true);
    expect(await as(member, (tx) => listSavedViews(tx, ws, member.userId, 'leads'))).toHaveLength(
      MAX_SAVED_VIEWS - 1,
    );
  });

  it('goes when the member leaves the workspace', async () => {
    await t.admin`delete from memberships where workspace_id = ${ws} and user_id = ${member.userId}`;
    expect(await t.admin`select 1 from saved_views where user_id = ${member.userId}`).toHaveLength(
      MAX_SAVED_VIEWS - 1,
    );
    expect(await as(member, (tx) => listSavedViews(tx, ws, member.userId, 'leads'))).toEqual([]);
  });
});
