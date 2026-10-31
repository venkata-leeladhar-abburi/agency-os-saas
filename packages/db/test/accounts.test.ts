import { permissionRows } from '@agency-os/core';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  acceptInvitation,
  AccountError,
  changeRole,
  createWorkspace,
  inviteMember,
  listMembers,
  myProfile,
  myWorkspaces,
  removeMember,
  revokeInvitation,
  updateMyProfile,
} from '../src/accounts';
import { withService, withUser, type Session } from '../src/client';
import {
  auditLog,
  invitations,
  memberships,
  profiles,
  rolePermissions,
  workspaces,
} from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let kiran: Session; // owner of One Stop
let sarah: Session; // owner of Northwind (another tenant)
let arjun: Session; // member of One Stop, invited
let wsA: string;
let wsB: string;

const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
const denied = pgError(/row-level security/);

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);

beforeAll(async () => {
  t = await createTestDb();
  kiran = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  sarah = {
    userId: await t.createUser('sarah@northwind.example'),
    email: 'sarah@northwind.example',
  };
  arjun = { userId: await t.createUser('arjun@onestop.in'), email: 'arjun@onestop.in' };
  wsA = await as(kiran, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  wsB = await as(sarah, (tx) => createWorkspace(tx, { name: 'Northwind Studio', country: 'GB' }));
  // Free allows one member; these tests invite several.
  await t.admin`update workspaces set plan = 'growth' where id = ${wsA}`;
  const { token } = await as(kiran, (tx) =>
    inviteMember(tx, {
      workspaceId: wsA,
      email: 'arjun@onestop.in',
      role: 'member',
      invitedBy: kiran.userId,
    }),
  );
  await as(arjun, (tx) => acceptInvitation(tx, token));
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('creating a workspace', () => {
  it('applies the country defaults and makes the creator the owner', async () => {
    const [a] = await t.admin`select * from workspaces where id = ${wsA}`;
    expect(a).toMatchObject({
      slug: 'one-stop-solutions',
      base_currency: 'INR',
      locale: 'en-IN',
      time_zone: 'Asia/Kolkata',
      invoice_prefix: 'OSS',
    });
    const [b] = await t.admin`select * from workspaces where id = ${wsB}`;
    expect(b).toMatchObject({ base_currency: 'GBP', time_zone: 'Europe/London' });
    const mine = await as(kiran, (tx) => myWorkspaces(tx));
    expect(mine).toEqual([expect.objectContaining({ id: wsA, role: 'owner' })]);
  });

  it('refuses a taken address and an empty name', async () => {
    await expect(
      as(arjun, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' })),
    ).rejects.toMatchObject({ code: 'slug_taken' });
    await expect(
      as(arjun, (tx) => createWorkspace(tx, { name: '   ', slug: 'blank' })),
    ).rejects.toMatchObject({ code: 'name_required' });
  });

  it('needs a signed-in user', async () => {
    await expect(
      t.db.transaction(async (tx) => {
        await tx.execute(sql`set local role authenticated`);
        return createWorkspace(tx, { name: 'Nobody', slug: 'nobody' });
      }),
    ).rejects.toMatchObject({ code: 'not_signed_in' });
  });

  it('writes the audit log', async () => {
    const rows =
      await t.admin`select action from audit_log where workspace_id = ${wsA} order by created_at`;
    expect(rows.map((r) => r.action)).toEqual([
      'workspace.created',
      'invitation.created',
      'invitation.accepted',
    ]);
  });
});

describe('tenant isolation (row-level security)', () => {
  it('a member of workspace A cannot read workspace B', async () => {
    const seen = await as(kiran, (tx) => tx.select().from(workspaces));
    expect(seen.map((w) => w.id)).toEqual([wsA]);
    expect(
      await as(kiran, (tx) =>
        tx.select().from(memberships).where(eq(memberships.workspaceId, wsB)),
      ),
    ).toEqual([]);
    expect(
      await as(kiran, (tx) =>
        tx.select().from(invitations).where(eq(invitations.workspaceId, wsB)),
      ),
    ).toEqual([]);
    expect(
      await as(kiran, (tx) => tx.select().from(auditLog).where(eq(auditLog.workspaceId, wsB))),
    ).toEqual([]);
  });

  it('a member of workspace A cannot write to workspace B', async () => {
    const updated = await as(kiran, (tx) =>
      tx.update(workspaces).set({ name: 'Taken over' }).where(eq(workspaces.id, wsB)).returning(),
    );
    expect(updated).toEqual([]);
    await expect(
      as(kiran, (tx) =>
        tx.insert(memberships).values({ workspaceId: wsB, userId: kiran.userId, role: 'owner' }),
      ),
    ).rejects.toMatchObject(denied);
    await expect(
      as(kiran, (tx) =>
        inviteMember(tx, {
          workspaceId: wsB,
          email: 'x@example.com',
          role: 'admin',
          invitedBy: kiran.userId,
        }),
      ),
    ).rejects.toMatchObject({ code: 'no_access' });
    await expect(
      as(kiran, (tx) =>
        tx.insert(invitations).values({
          workspaceId: wsB,
          email: 'x@example.com',
          role: 'admin',
          tokenHash: 'x',
          invitedBy: kiran.userId,
          expiresAt: new Date(),
        }),
      ),
    ).rejects.toMatchObject(denied);
    await expect(
      as(kiran, (tx) =>
        tx.insert(auditLog).values({ workspaceId: wsB, actorId: kiran.userId, action: 'x' }),
      ),
    ).rejects.toMatchObject(denied);
    const [b] = await t.admin`select name from workspaces where id = ${wsB}`;
    expect(b!.name).toBe('Northwind Studio');
  });

  it('shows profiles only of people you share a workspace with', async () => {
    const seen = await as(kiran, (tx) => tx.select({ id: profiles.id }).from(profiles));
    expect(seen.map((p) => p.id).sort()).toEqual([kiran.userId, arjun.userId].sort());
  });

  it('shows nothing without a signed-in user', async () => {
    const rows = await t.db.transaction(async (tx) => {
      await tx.execute(sql`set local role authenticated`);
      return tx.select().from(workspaces);
    });
    expect(rows).toEqual([]);
  });

  it('lets jobs work across tenants only through withService with a workspace id', async () => {
    const count = await withService(t.db, wsB, async (tx, id) =>
      tx.select().from(workspaces).where(eq(workspaces.id, id)),
    );
    expect(count).toHaveLength(1);
    await expect(withService(t.db, 'not-an-id', async () => 1)).rejects.toThrow(
      'withService needs a workspace id',
    );
  });
});

describe('roles', () => {
  it('stores the same permissions as packages/core', async () => {
    const rows = await as(arjun, (tx) => tx.select().from(rolePermissions));
    const key = (r: { role: string; permission: string; scope: string }) =>
      `${r.role}:${r.permission}:${r.scope}`;
    expect(rows.map(key).sort()).toEqual(permissionRows().map(key).sort());
  });

  it('lets only workspace.manage change workspace settings', async () => {
    expect(
      await as(arjun, (tx) =>
        tx.update(workspaces).set({ name: 'Renamed' }).where(eq(workspaces.id, wsA)).returning(),
      ),
    ).toEqual([]);
    const done = await as(kiran, (tx) =>
      tx
        .update(workspaces)
        .set({ legalName: 'One Stop Solutions LLP' })
        .where(eq(workspaces.id, wsA))
        .returning(),
    );
    expect(done).toHaveLength(1);
  });

  it('keeps members from inviting people or reading the audit log', async () => {
    await expect(
      as(arjun, (tx) =>
        inviteMember(tx, {
          workspaceId: wsA,
          email: 'friend@example.com',
          role: 'admin',
          invitedBy: arjun.userId,
        }),
      ),
    ).rejects.toMatchObject(denied);
    expect(await as(arjun, (tx) => tx.select().from(auditLog))).toEqual([]);
    expect(
      await as(kiran, (tx) => tx.select().from(auditLog).where(eq(auditLog.workspaceId, wsA))),
    ).not.toEqual([]);
  });

  it('lets members see who else is in the workspace', async () => {
    const members = await as(arjun, (tx) => listMembers(tx, wsA));
    expect(members.map((m) => m.role).sort()).toEqual(['member', 'owner']);
  });

  it('always keeps an owner', async () => {
    const [own] =
      await t.admin`select id from memberships where workspace_id = ${wsA} and role = 'owner'`;
    await expect(as(kiran, (tx) => changeRole(tx, own!.id, 'admin'))).rejects.toMatchObject({
      code: 'last_owner',
    });
    await expect(as(kiran, (tx) => removeMember(tx, own!.id))).rejects.toMatchObject({
      code: 'last_owner',
    });
  });

  it('lets owners change roles; members cannot change their own', async () => {
    const [m] =
      await t.admin`select id from memberships where workspace_id = ${wsA} and user_id = ${arjun.userId}`;
    expect(await as(arjun, (tx) => changeRole(tx, m!.id, 'admin'))).toEqual([]);
    expect(await as(kiran, (tx) => changeRole(tx, m!.id, 'project_lead'))).toHaveLength(1);
    await as(kiran, (tx) => changeRole(tx, m!.id, 'member'));
  });
});

describe('the audit log is append-only', () => {
  it('rejects entries in someone else’s name, and any update or delete', async () => {
    await expect(
      as(kiran, (tx) =>
        tx.insert(auditLog).values({ workspaceId: wsA, actorId: arjun.userId, action: 'forged' }),
      ),
    ).rejects.toMatchObject(denied);
    await expect(
      as(kiran, (tx) => tx.update(auditLog).set({ action: 'edited' }).returning()),
    ).rejects.toMatchObject(pgError(/permission denied/));
    await expect(as(kiran, (tx) => tx.delete(auditLog).returning())).rejects.toMatchObject(
      pgError(/permission denied/),
    );
  });
});

describe('invitations', () => {
  const invite = (email: string) =>
    as(kiran, (tx) =>
      inviteMember(tx, { workspaceId: wsA, email, role: 'finance', invitedBy: kiran.userId }),
    );

  it('stores only a hash of the token and expires in 7 days', async () => {
    const { id, token } = await invite('meera@onestop.in');
    const [row] =
      await t.admin`select token_hash, expires_at, created_at from invitations where id = ${id}`;
    expect(row!.token_hash).not.toContain(token);
    expect(row!.token_hash).toHaveLength(64);
    const days = (row!.expires_at.getTime() - row!.created_at.getTime()) / 86_400_000;
    expect(days).toBeCloseTo(7, 1);
  });

  it('accepts once, for the invited email only', async () => {
    const meera = { userId: await t.createUser('Meera@OneStop.in'), email: 'meera@onestop.in' };
    const other = { userId: await t.createUser('someone@else.in'), email: 'someone@else.in' };
    const { token } = await invite('meera@onestop.in');
    await expect(as(other, (tx) => acceptInvitation(tx, token))).rejects.toMatchObject({
      code: 'invite_wrong_email',
    });
    expect(await as(meera, (tx) => acceptInvitation(tx, token))).toBe(wsA);
    await expect(as(meera, (tx) => acceptInvitation(tx, token))).rejects.toMatchObject({
      code: 'invite_used',
    });
    const role = await as(meera, (tx) =>
      tx
        .select({ role: memberships.role })
        .from(memberships)
        .where(eq(memberships.userId, meera.userId)),
    );
    expect(role).toEqual([{ role: 'finance' }]);
  });

  it('refuses expired, revoked, unknown and already-member invites', async () => {
    const exp = await invite('late@onestop.in');
    await t.admin`update invitations set expires_at = now() - interval '1 minute' where id = ${exp.id}`;
    const late = { userId: await t.createUser('late@onestop.in'), email: 'late@onestop.in' };
    await expect(as(late, (tx) => acceptInvitation(tx, exp.token))).rejects.toMatchObject({
      code: 'invite_expired',
    });

    const rev = await invite('late@onestop.in');
    expect(await as(kiran, (tx) => revokeInvitation(tx, rev.id))).toBe(true);
    await expect(as(late, (tx) => acceptInvitation(tx, rev.token))).rejects.toMatchObject({
      code: 'invite_revoked',
    });

    await expect(as(late, (tx) => acceptInvitation(tx, 'not-a-real-token'))).rejects.toMatchObject({
      code: 'invite_not_found',
    });

    const again = await as(kiran, (tx) =>
      inviteMember(tx, {
        workspaceId: wsA,
        email: 'arjun@onestop.in',
        role: 'admin',
        invitedBy: kiran.userId,
      }),
    );
    await expect(as(arjun, (tx) => acceptInvitation(tx, again.token))).rejects.toMatchObject({
      code: 'already_member',
    });
  });

  it('never invites owners and needs a way to reach the person', async () => {
    await expect(
      as(kiran, (tx) =>
        inviteMember(tx, {
          workspaceId: wsA,
          role: 'owner',
          email: 'x@y.in',
          invitedBy: kiran.userId,
        }),
      ),
    ).rejects.toThrow('Owners');
    await expect(
      as(kiran, (tx) =>
        inviteMember(tx, { workspaceId: wsA, role: 'member', invitedBy: kiran.userId }),
      ),
    ).rejects.toThrow('email or a phone');
  });

  it('gives each error a message that says what to do', () => {
    expect(new AccountError('invite_expired').message).toContain('ask for a new one');
  });
});

describe('your own profile', () => {
  it('changes your name and phone, which your team then sees', async () => {
    await expect(
      as(arjun, (tx) => updateMyProfile(tx, arjun.userId, { fullName: ' A ', phone: null })),
    ).rejects.toMatchObject({ code: 'profile_name_required' });
    await expect(
      as(arjun, (tx) =>
        updateMyProfile(tx, arjun.userId, { fullName: 'Arjun Mehta', phone: '9'.repeat(21) }),
      ),
    ).rejects.toMatchObject({ code: 'profile_phone_too_long' });
    await as(arjun, (tx) =>
      updateMyProfile(tx, arjun.userId, {
        fullName: '  Arjun   Mehta ',
        phone: ' +91 98480 22338 ',
      }),
    );
    expect(await as(arjun, (tx) => myProfile(tx, arjun.userId))).toEqual({
      fullName: 'Arjun Mehta',
      phone: '+91 98480 22338',
    });
    const members = await as(kiran, (tx) => listMembers(tx, wsA));
    expect(members.find((m) => m.userId === arjun.userId)).toMatchObject({
      name: 'Arjun Mehta',
    });
  });

  it('never changes someone else’s', async () => {
    await expect(
      as(sarah, (tx) => updateMyProfile(tx, arjun.userId, { fullName: 'Not Arjun', phone: null })),
    ).rejects.toThrow();
    expect((await as(arjun, (tx) => myProfile(tx, arjun.userId))).fullName).toBe('Arjun Mehta');
    // Someone outside your workspaces can't read it either.
    expect(await as(sarah, (tx) => myProfile(tx, arjun.userId))).toEqual({
      fullName: null,
      phone: null,
    });
  });
});
