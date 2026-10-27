// Runs the team, notification and audit screens' data functions against a real Postgres
// (TEST_DATABASE_URL), as members, with RLS: the same path the pages take once signed in.
import {
  acceptInvitation,
  createClient,
  createWorkspace,
  withUser,
  type Session,
} from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import {
  auditFor,
  changeRoleFor,
  dailyUpdatesOn,
  inviteFor,
  markReadFor,
  notificationList,
  postDailyUpdateFor,
  prefsFor,
  removeFor,
  resendFor,
  revokeFor,
  savePrefsFor,
  teamFor,
  writeAudit,
} from './team';
import { addCommentFor, createProjectFor, createTaskFor } from './work';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let owner: WorkspaceCtx;
let meera: WorkspaceCtx;
let other: WorkspaceCtx;
const ctxOf = (db: TestDb, session: Session, workspaceId: string, slug: string): WorkspaceCtx => ({
  db: db.db,
  session,
  workspaceId,
  slug,
  role: 'owner',
  plan: 'growth',
});

run('team, notifications and the audit log on the database', () => {
  beforeAll(async () => {
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const m: Session = {
      userId: await t.createUser('meera@onestop.in'),
      email: 'meera@onestop.in',
    };
    const sarah: Session = {
      userId: await t.createUser('sarah@northwind.example'),
      email: 'sarah@northwind.example',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    const ws2 = await withUser(t.db, sarah, (tx) =>
      createWorkspace(tx, { name: 'Northwind', slug: 'northwind' }),
    );
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${kiran.userId}`;
    await t.admin`update profiles set full_name = 'Meera Iyer' where id = ${m.userId}`;
    owner = ctxOf(t, kiran, ws, 'one-stop');
    meera = { ...ctxOf(t, m, ws, 'one-stop'), role: 'member' };
    other = ctxOf(t, sarah, ws2, 'northwind');
  }, 60_000);

  afterAll(async () => {
    await t?.drop();
  });

  it('invites by email, refuses a second open invite, and lets the person join', async () => {
    const first = await inviteFor(owner, 'Meera@OneStop.in', 'member');
    expect(first).toMatchObject({ ok: true });
    expect(await inviteFor(owner, 'meera@onestop.in', 'member')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/already have an invite/),
    });
    expect(await inviteFor(owner, 'x@onestop.in', 'owner')).toMatchObject({ ok: false });
    let team = await teamFor(owner);
    expect(team.invites).toMatchObject([{ email: 'meera@onestop.in', state: 'pending' }]);

    // Sending again: the old link stops working.
    const again = (await resendFor(owner, team.invites[0]!.id))!;
    expect(again.token).not.toBe(first.token);
    await expect(
      withUser(t.db, meera.session, (tx) => acceptInvitation(tx, first.token!)),
    ).rejects.toThrow();
    await withUser(t.db, meera.session, (tx) => acceptInvitation(tx, again.token));

    team = await teamFor(owner);
    expect(team.invites).toEqual([]);
    expect(team.members.map((x) => [x.name, x.email, x.role, x.you])).toEqual([
      ['Kiran Rao', 'kiran@onestop.in', 'owner', true],
      ['Meera Iyer', 'meera@onestop.in', 'member', false],
    ]);
    expect(await inviteFor(owner, 'meera@onestop.in', 'admin')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/already a member/),
    });
  });

  it('cancels invites, changes roles, keeps an owner and never removes yourself', async () => {
    await inviteFor(owner, 'ravi@onestop.in', 'finance');
    const invite = (await teamFor(owner)).invites[0]!;
    expect(await revokeFor(owner, invite.id)).toEqual({ email: 'ravi@onestop.in' });
    expect((await teamFor(owner)).invites).toEqual([]);

    const [me, m] = (await teamFor(owner)).members;
    expect(await changeRoleFor(owner, me!.id, 'admin')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/at least one owner/),
    });
    expect(await changeRoleFor(owner, m!.id, 'project_lead')).toMatchObject({ ok: true });
    expect(await removeFor(owner, me!.id)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/can’t remove yourself/),
    });
  });

  it('keeps one daily update per person a day', async () => {
    await expect(postDailyUpdateFor(owner, { done: '', next: '', blockers: '' })).rejects.toThrow(
      /what you did/,
    );
    await postDailyUpdateFor(owner, { done: 'Wireframes', next: '', blockers: '' });
    await postDailyUpdateFor(owner, { done: 'Wireframes v2', next: 'Review', blockers: '' });
    const today = new Date().toISOString().slice(0, 10);
    const updates = await dailyUpdatesOn(owner, today);
    expect(updates.posted).toHaveLength(1);
    expect(updates.mine).toMatchObject({ member: 'Kiran Rao', done: 'Wireframes v2' });
    expect(updates.waiting).toEqual(['Meera Iyer']);
  });

  it('tells people in the app when a task is theirs or they are mentioned', async () => {
    const client = await withUser(t.db, owner.session, (tx) =>
      createClient(tx, owner.workspaceId, { name: 'Example Acme Labs' }, owner.session.userId),
    );
    const project = await createProjectFor(owner, {
      name: 'Website',
      clientId: client,
      template: 'blank',
      lead: 'Kiran Rao',
      budgetMinor: 0n,
      startOn: '2026-10-27',
      dueOn: '2026-12-01',
    });
    const task = await createTaskFor(owner, {
      title: 'Homepage copy',
      projectId: project,
      phase: null,
      assignee: 'Meera Iyer',
      dueOn: null,
      priority: 'normal',
      status: 'todo',
      description: '',
    });
    expect(await addCommentFor(owner, task, 'Can you look, @Meera Iyer')).toEqual(['Meera Iyer']);

    const list = await notificationList(meera, 'one-stop');
    expect(list.unread).toBe(2);
    expect(list.rows.map((r) => [r.title, r.href])).toEqual([
      ['You were mentioned in Homepage copy', `/w/one-stop/tasks/${task}`],
      ['Homepage copy was assigned to you', `/w/one-stop/tasks/${task}`],
    ]);
    // Nobody is told about their own actions.
    expect((await notificationList(owner, 'one-stop')).rows).toEqual([]);

    await markReadFor(meera, list.rows[0]!.id);
    expect((await notificationList(meera, 'one-stop')).unread).toBe(1);
    await markReadFor(meera);
    expect((await notificationList(meera, 'one-stop')).unread).toBe(0);
  });

  it('saves each person’s notification settings, and a switched-off one stays quiet', async () => {
    const prefs = await prefsFor(meera);
    expect(prefs.task_mentioned).toEqual({ inApp: true, email: false });
    expect(prefs.proposal_decided).toEqual({ inApp: true, email: true });
    await savePrefsFor(meera, { ...prefs, task_mentioned: { inApp: false, email: false } });
    expect((await prefsFor(meera)).task_mentioned).toEqual({ inApp: false, email: false });
    // Kiran's are his own.
    expect((await prefsFor(owner)).task_mentioned).toEqual({ inApp: true, email: false });
  });

  it('keeps the audit log, in words, with a filter, for owners only', async () => {
    await writeAudit(owner, {
      action: 'member.role_changed',
      subject: 'meera@onestop.in',
      detail: 'Now Project lead',
      ip: '203.0.113.7',
    });
    const all = await auditFor(owner);
    expect(all.rows.map((r) => r.action)).toEqual(
      expect.arrayContaining(['member.role_changed', 'invitation.created']),
    );
    const roles = await auditFor(owner, { action: 'member.role_changed' });
    expect(roles).toMatchObject({ total: 1, pages: 1 });
    expect(roles.rows[0]).toMatchObject({
      actor: 'Kiran Rao',
      subject: 'meera@onestop.in',
      detail: 'Now Project lead',
      ip: '203.0.113.7',
    });
    const invited = (await auditFor(owner, { action: 'invitation.created' })).rows[0];
    expect(invited).toMatchObject({ subject: 'ravi@onestop.in', detail: 'As Finance' });
    // A project lead can't read it, and another workspace sees none of it.
    expect((await auditFor({ ...meera, role: 'project_lead' })).rows).toEqual([]);
    // Northwind sees only its own entries (its "workspace created"), none of ours.
    const theirs = (await auditFor(other)).rows;
    expect(theirs.some((r) => r.actor === 'Kiran Rao' || r.action.startsWith('member.'))).toBe(
      false,
    );
    expect((await teamFor(other)).members.map((m) => m.email)).toEqual(['sarah@northwind.example']);
  });
});
