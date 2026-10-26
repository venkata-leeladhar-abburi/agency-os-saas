import { toCsv } from '@agency-os/core';
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWorkspace, inviteMember, acceptInvitation } from '../src/accounts';
import {
  applyRazorpaySubscriptionEvent,
  handleRazorpayWebhook,
  unprocessedWebhooks,
  verifyRazorpaySignature,
  workspaceOfEvent,
  type RazorpaySubscriptionEvent,
} from '../src/billing';
import { connect, pingDatabase, withService, withUser, type Session } from '../src/client';
import {
  checkPlanLimit,
  exportWorkspace,
  listAuditLog,
  listNotifications,
  markRead,
  notificationSettings,
  notify,
  setNotificationPreference,
  unreadCount,
} from '../src/platform';
import { notifications, subscriptions, webhookEvents } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let member: Session;
let outsider: Session;
let ws: string;
let other: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  member = { userId: await t.createUser('arjun@onestop.in'), email: 'arjun@onestop.in' };
  outsider = {
    userId: await t.createUser('sarah@northwind.example'),
    email: 'sarah@northwind.example',
  };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  other = await as(outsider, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('plan limits', () => {
  it('lets Free have one member, then names the plan to upgrade to', async () => {
    const check = await as(owner, (tx) => checkPlanLimit(tx, ws, 'members'));
    expect(check).toMatchObject({ allowed: false, limit: 1, used: 1, upgradeTo: 'starter' });
    await expect(
      as(owner, (tx) =>
        inviteMember(tx, {
          workspaceId: ws,
          email: 'arjun@onestop.in',
          role: 'member',
          invitedBy: owner.userId,
        }),
      ),
    ).rejects.toMatchObject({
      code: 'plan_limit',
      message: 'Your Free plan includes 1 member. Upgrade to Agency Starter to add more.',
    });
  });

  it('counts pending invitations towards the member limit', async () => {
    await t.admin`update workspaces set plan = 'starter' where id = ${ws}`;
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: 'arjun@onestop.in',
        role: 'member',
        invitedBy: owner.userId,
      }),
    );
    for (const n of [1, 2, 3])
      await as(owner, (tx) =>
        inviteMember(tx, {
          workspaceId: ws,
          email: `p${n}@onestop.in`,
          role: 'member',
          invitedBy: owner.userId,
        }),
      );
    expect(await as(owner, (tx) => checkPlanLimit(tx, ws, 'members'))).toMatchObject({
      allowed: false,
      used: 5,
    });
    await as(member, (tx) => acceptInvitation(tx, token));
    expect(await as(owner, (tx) => checkPlanLimit(tx, ws, 'members'))).toMatchObject({ used: 5 });
  });

  it('refuses resources without a counter yet', async () => {
    await expect(as(owner, (tx) => checkPlanLimit(tx, ws, 'portal_clients'))).rejects.toThrow(
      'No usage counter',
    );
  });

  it('can’t check another workspace', async () => {
    await expect(as(owner, (tx) => checkPlanLimit(tx, other, 'members'))).rejects.toMatchObject({
      code: 'no_access',
    });
  });
});

describe('notifications', () => {
  it('creates in-app rows only for people who get them, and reports who gets email', async () => {
    await as(member, (tx) =>
      setNotificationPreference(tx, {
        workspaceId: ws,
        userId: member.userId,
        kind: 'payment.received',
        pref: { inApp: false, email: 'digest' },
      }),
    );
    const sent = await withService(t.db, ws, (tx, id) =>
      notify(tx, {
        workspaceId: id,
        userIds: [owner.userId, member.userId],
        kind: 'payment.received',
        payload: { number: 'OSS/26-27/014' },
      }),
    );
    expect(sent).toEqual({ inApp: [owner.userId], email: [owner.userId], digest: [member.userId] });
    expect(
      await withService(t.db, ws, (tx, id) =>
        notify(tx, { workspaceId: id, userIds: [], kind: 'lead.enquiry', payload: {} }),
      ),
    ).toEqual({
      inApp: [],
      email: [],
      digest: [],
    });
  });

  it('shows each member only their own, and marks them read', async () => {
    await withService(t.db, ws, (tx, id) =>
      notify(tx, {
        workspaceId: id,
        userIds: [owner.userId, member.userId],
        kind: 'lead.enquiry',
        payload: { name: 'Example lead' },
      }),
    );
    expect(await as(owner, (tx) => unreadCount(tx, ws))).toBe(2);
    expect(await as(member, (tx) => unreadCount(tx, ws))).toBe(1);
    expect(await as(outsider, (tx) => listNotifications(tx, ws))).toEqual([]);
    const [first] = await as(owner, (tx) => listNotifications(tx, ws));
    expect(first!.kind).toBe('lead.enquiry');
    expect(await as(owner, (tx) => markRead(tx, ws, [first!.id]))).toBe(1);
    expect(await as(owner, (tx) => listNotifications(tx, ws, { unreadOnly: true }))).toHaveLength(
      1,
    );
    expect(await as(member, (tx) => markRead(tx, ws, [first!.id]))).toBe(0);
    expect(await as(owner, (tx) => markRead(tx, ws))).toBe(1);
    expect(await as(owner, (tx) => unreadCount(tx, ws))).toBe(0);
  });

  it('lets members change only read_at, and never create notifications', async () => {
    await expect(
      as(owner, (tx) =>
        tx
          .insert(notifications)
          .values({ workspaceId: ws, userId: owner.userId, kind: 'x', payload: {} }),
      ),
    ).rejects.toMatchObject(pgError(/permission denied/));
    await expect(
      as(owner, (tx) => tx.update(notifications).set({ kind: 'changed' })),
    ).rejects.toMatchObject(pgError(/permission denied/));
  });

  it('lists settings with the member’s changes over the defaults', async () => {
    const settings = await as(member, (tx) => notificationSettings(tx, ws, member.userId));
    expect(settings).toHaveLength(13);
    expect(settings.find((s) => s.kind === 'payment.received')).toMatchObject({
      inApp: false,
      email: 'digest',
    });
    expect(settings.find((s) => s.kind === 'lead.enquiry')).toMatchObject({
      inApp: true,
      email: 'on',
      area: 'sales',
    });
    await as(member, (tx) =>
      setNotificationPreference(tx, {
        workspaceId: ws,
        userId: member.userId,
        kind: 'payment.received',
        pref: {},
      }),
    );
    const reset = await as(member, (tx) => notificationSettings(tx, ws, member.userId));
    expect(reset.find((s) => s.kind === 'payment.received')).toMatchObject({
      inApp: true,
      email: 'on',
    });
  });

  it('refuses preferences for someone else or another workspace', async () => {
    await expect(
      as(member, (tx) =>
        setNotificationPreference(tx, {
          workspaceId: ws,
          userId: owner.userId,
          kind: 'lead.enquiry',
          pref: { email: 'off' },
        }),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
    await expect(
      as(member, (tx) =>
        setNotificationPreference(tx, {
          workspaceId: other,
          userId: member.userId,
          kind: 'lead.enquiry',
          pref: { email: 'off' },
        }),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
  });
});

describe('audit log and export', () => {
  it('lists the audit log newest first with names, for owners only', async () => {
    const log = await as(owner, (tx) => listAuditLog(tx, ws, { limit: 3 }));
    expect(log).toHaveLength(3);
    expect(log[0]!.action).toBe('invitation.accepted');
    expect(log[0]!.actorName).toBe('arjun');
    const older = await as(owner, (tx) => listAuditLog(tx, ws, { before: log[2]!.createdAt }));
    expect(older.at(-1)!.action).toBe('workspace.created');
    expect(await as(member, (tx) => listAuditLog(tx, ws))).toEqual([]);
  });

  it('exports every record without secrets, and records that it did', async () => {
    const data = await as(owner, (tx) => exportWorkspace(tx, ws, owner.userId));
    expect(data).toMatchObject({ format: 'agency-os-export', version: 1, workspaceId: ws });
    expect(data.tables.workspace).toHaveLength(1);
    expect(data.tables.members).toHaveLength(2);
    expect(data.tables.invitations).toHaveLength(4);
    expect(JSON.stringify(data)).not.toContain('token_hash');
    expect(JSON.stringify(data)).not.toMatch(/tokenHash/);
    expect(toCsv(data.tables.members!)).toContain('role');
    const [last] = await as(owner, (tx) => listAuditLog(tx, ws, { limit: 1 }));
    expect(last!.action).toBe('data.exported');
  });

  it('refuses export without data.export, and for another workspace', async () => {
    await expect(as(member, (tx) => exportWorkspace(tx, ws, member.userId))).rejects.toMatchObject({
      code: 'no_access',
    });
    await expect(as(owner, (tx) => exportWorkspace(tx, other, owner.userId))).rejects.toMatchObject(
      { code: 'no_access' },
    );
  });
});

describe('Razorpay subscription webhooks', () => {
  const secret = 'test-webhook-secret';
  const event = (status: string, plan = 'growth', workspace = ws): RazorpaySubscriptionEvent => ({
    event: `subscription.${status}`,
    payload: {
      subscription: {
        entity: {
          id: 'sub_example',
          status: status as never,
          current_end: 1_793_000_000,
          notes: { workspace_id: workspace, plan },
        },
      },
    },
  });
  const apply = (id: string, e: RazorpaySubscriptionEvent) =>
    withService(t.db, workspaceOfEvent(e)!, (tx, wsId) =>
      applyRazorpaySubscriptionEvent(tx, wsId, id, e),
    );
  const planOf = async () => (await t.admin`select plan from workspaces where id = ${ws}`)[0]!.plan;

  it('verifies the signature in constant time', () => {
    const body = JSON.stringify(event('activated'));
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyRazorpaySignature(body, signature, secret)).toBe(true);
    expect(verifyRazorpaySignature(body + ' ', signature, secret)).toBe(false);
    expect(verifyRazorpaySignature(body, 'short', secret)).toBe(false);
    expect(verifyRazorpaySignature(body, null, secret)).toBe(false);
    expect(() => verifyRazorpaySignature(body, signature, '')).toThrow('RAZORPAY_WEBHOOK_SECRET');
  });

  it('moves the workspace to the paid plan once, and back to Free when it ends', async () => {
    expect(await apply('evt_1', event('authenticated'))).toBe('applied');
    expect(await planOf()).toBe('starter');
    expect(await apply('evt_2', event('active'))).toBe('applied');
    expect(await planOf()).toBe('growth');
    expect(await apply('evt_2', event('active'))).toBe('duplicate');
    const [sub] =
      await t.admin`select status, current_period_end from subscriptions where workspace_id = ${ws}`;
    expect(sub!.status).toBe('active');
    expect(sub!.current_period_end.getTime()).toBe(1_793_000_000_000);
    expect(await apply('evt_3', event('pending'))).toBe('applied');
    expect(await planOf()).toBe('growth');
    expect(await apply('evt_4', event('halted'))).toBe('applied');
    expect(await planOf()).toBe('free');
    const log = await as(owner, (tx) => listAuditLog(tx, ws, { limit: 1 }));
    expect(log[0]).toMatchObject({ action: 'subscription.updated', actorName: null });
  });

  it('ignores other events and refuses bad notes', async () => {
    expect(
      await withService(t.db, ws, (tx, id) =>
        applyRazorpaySubscriptionEvent(tx, id, 'evt_5', { event: 'payment.captured', payload: {} }),
      ),
    ).toBe('ignored');
    await expect(
      withService(t.db, ws, (tx, id) =>
        applyRazorpaySubscriptionEvent(tx, id, 'evt_6', event('active', 'growth', other)),
      ),
    ).rejects.toThrow('different workspace');
    await expect(apply('evt_7', event('active', 'free'))).rejects.toThrow('no paid plan');
    // A failed event rolls back with its transaction, so a retry can apply it.
    expect(await t.admin`select 1 from webhook_events where event_id = 'evt_7'`).toHaveLength(0);
    expect(await withService(t.db, ws, (tx) => unprocessedWebhooks(tx))).toEqual([]);
  });

  it('shows the subscription only to billing.manage, and webhook events to nobody', async () => {
    expect(await as(owner, (tx) => tx.select().from(subscriptions))).toHaveLength(1);
    expect(await as(member, (tx) => tx.select().from(subscriptions))).toEqual([]);
    expect(await as(outsider, (tx) => tx.select().from(subscriptions))).toEqual([]);
    await expect(as(owner, (tx) => tx.select().from(webhookEvents))).rejects.toMatchObject(
      pgError(/permission denied/),
    );
  });

  it('handles the whole request: signature, event id, duplicates', async () => {
    const body = JSON.stringify(event('active', 'starter'));
    const sign = (b: string) => createHmac('sha256', secret).update(b).digest('hex');
    const call = (
      b: string,
      signature: string | null,
      eventId: string | null,
      key: string | undefined = secret,
    ) => handleRazorpayWebhook(t.db, b, { signature, eventId }, key);
    expect(await call(body, sign(body), 'evt_10', '')).toMatchObject({ status: 503 });
    expect(await call(body, 'bad', 'evt_10')).toMatchObject({ status: 401 });
    expect(await call(body, sign(body), null)).toMatchObject({ status: 400 });
    expect(await call('not json', sign('not json'), 'evt_10')).toMatchObject({ status: 400 });
    expect(await call(body, sign(body), 'evt_10')).toEqual({
      status: 200,
      body: { outcome: 'applied' },
    });
    expect(await call(body, sign(body), 'evt_10')).toEqual({
      status: 200,
      body: { outcome: 'duplicate' },
    });
    expect(await planOf()).toBe('starter');
    const other = JSON.stringify({ event: 'payment.captured', payload: {} });
    expect(await call(other, sign(other), 'evt_11')).toEqual({
      status: 200,
      body: { outcome: 'ignored' },
    });
  });
});

describe('health', () => {
  it('reports whether the database answers', async () => {
    expect(await pingDatabase(t.db)).toBe(true);
    const broken = connect('postgresql://nobody:wrong@localhost:1/none');
    expect(await pingDatabase(broken.db)).toBe(false);
    await broken.close();
  });
});
