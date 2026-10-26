import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { createClient } from '../src/clients';
import { createProject, getProject } from '../src/projects';
import { tasks } from '../src/schema';
import {
  addTaskComment,
  createTask,
  dailyUpdatesFor,
  deleteComment,
  deleteTask,
  editComment,
  listComments,
  listTasks,
  moveTask,
  myTasks,
  saveDailyUpdate,
  subtasks,
  taskBoard,
  teamOverview,
  updateTask,
} from '../src/tasks';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let lead: Session;
let member: Session;
let bystander: Session;
let outsider: Session;
let ws: string;
let projectId: string;
let otherProject: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
const task = (s: Session, title: string, extra: Partial<Parameters<typeof createTask>[2]> = {}) =>
  as(s, (tx) => createTask(tx, ws, { projectId, title, ...extra }, s.userId));

beforeAll(async () => {
  t = await createTestDb();
  const user = async (email: string) => ({ userId: await t.createUser(email), email });
  owner = await user('kiran@onestop.in');
  lead = await user('ravi@onestop.in');
  member = await user('arjun@onestop.in');
  bystander = await user('neha@onestop.in');
  outsider = await user('sarah@northwind.example');
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await as(outsider, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  for (const [s, role] of [
    [lead, 'project_lead'],
    [member, 'member'],
    [bystander, 'member'],
  ] as const) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, { workspaceId: ws, email: s.email!, role, invitedBy: owner.userId }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
  const clientId = await as(owner, (tx) =>
    createClient(tx, ws, { name: 'Example Kite & Co' }, owner.userId),
  );
  projectId = await as(owner, (tx) =>
    createProject(
      tx,
      ws,
      { clientId, name: 'Example Website', leadMemberId: lead.userId, memberIds: [member.userId] },
      owner.userId,
    ),
  );
  otherProject = await as(owner, (tx) =>
    createProject(tx, ws, { clientId, name: 'Example Other', template: 'blank' }, owner.userId),
  );
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('tasks', () => {
  it('adds tasks to the bottom of their column and tells the assignee', async () => {
    const a = await task(lead, 'Example wireframes', {
      assigneeId: member.userId,
      dueOn: '2026-10-28',
      priority: 'high',
    });
    expect(a.events).toEqual([
      expect.objectContaining({
        kind: 'task.assigned',
        userIds: [member.userId],
        payload: expect.objectContaining({ reason: 'assigned' }),
      }),
    ]);
    const b = await task(member, 'Example copy', { assigneeId: member.userId });
    expect(b.events).toEqual([]);
    await task(lead, 'Example review', { status: 'in_review' });
    const board = await as(lead, (tx) => taskBoard(tx, ws, projectId));
    expect(board.map((c) => [c.status, c.tasks.map((x) => x.title)])).toEqual([
      ['todo', ['Example wireframes', 'Example copy']],
      ['in_progress', []],
      ['in_review', ['Example review']],
      ['done', []],
    ]);
    await expect(task(lead, '  ')).rejects.toMatchObject({ code: 'task_title_required' });
  });

  it('moves cards between columns and records when a task is done', async () => {
    const board = await as(lead, (tx) => taskBoard(tx, ws, projectId));
    const [wire, copy] = board[0]!.tasks;
    await as(member, (tx) => moveTask(tx, { taskId: copy!.id, status: 'in_progress' }));
    await as(member, (tx) =>
      moveTask(tx, { taskId: wire!.id, status: 'in_progress', before: null, after: copy!.id }),
    );
    let col = (await as(lead, (tx) => taskBoard(tx, ws, projectId)))[1]!;
    expect(col.tasks.map((x) => x.title)).toEqual(['Example wireframes', 'Example copy']);
    await as(member, (tx) => moveTask(tx, { taskId: wire!.id, status: 'done' }));
    const [done] = await as(owner, (tx) => listTasks(tx, ws, { statuses: ['done'] }));
    expect(done!.completedAt).toBeInstanceOf(Date);
    await as(member, (tx) =>
      moveTask(tx, { taskId: wire!.id, status: 'in_progress', before: copy!.id }),
    );
    col = (await as(lead, (tx) => taskBoard(tx, ws, projectId)))[1]!;
    expect(col.tasks.map((x) => x.title)).toEqual(['Example copy', 'Example wireframes']);
    expect(col.tasks[1]!.completedAt).toBeNull();
  });

  it('keeps phases, subtasks and assignees within the project and workspace', async () => {
    const phase = (await as(owner, (tx) => getProject(tx, projectId)))!.phases[3]!;
    const parent = await task(lead, 'Example design', { phaseId: phase.id });
    await task(lead, 'Example home page', { parentTaskId: parent.id });
    expect((await as(lead, (tx) => subtasks(tx, parent.id))).map((x) => x.title)).toEqual([
      'Example home page',
    ]);
    expect(
      (await as(owner, (tx) => listTasks(tx, ws, { phaseId: phase.id }))).map((x) => x.title),
    ).toEqual(['Example design']);
    const otherPhase = (await as(owner, (tx) => getProject(tx, otherProject)))!.phases[0]!;
    await expect(task(lead, 'X', { phaseId: otherPhase.id })).rejects.toMatchObject({
      code: 'task_mismatch',
    });
    await expect(task(lead, 'X', { assigneeId: outsider.userId })).rejects.toMatchObject({
      code: 'task_mismatch',
    });
    const child = (await as(lead, (tx) => subtasks(tx, parent.id)))[0]!;
    await expect(task(lead, 'Too deep', { parentTaskId: child.id })).rejects.toMatchObject({
      code: 'task_mismatch',
    });
  });

  it('lists my tasks soonest first, and the calendar by due date', async () => {
    await task(lead, 'Example later', { assigneeId: member.userId, dueOn: '2026-11-15' });
    await task(lead, 'Example no date', { assigneeId: member.userId });
    const mine = await as(member, (tx) => myTasks(tx, ws, member.userId));
    expect(mine.map((r) => r.task.title)).toEqual([
      'Example wireframes',
      'Example later',
      'Example copy',
      'Example no date',
    ]);
    expect(mine[0]!.projectName).toBe('Example Website');
    const nov = await as(owner, (tx) =>
      listTasks(tx, ws, { dueFrom: '2026-11-01', dueTo: '2026-11-30' }),
    );
    expect(nov.map((x) => x.title)).toEqual(['Example later']);
  });
});

describe('who sees and changes tasks', () => {
  it('shows a project’s tasks to its team, and assigned tasks to the assignee', async () => {
    expect((await as(member, (tx) => listTasks(tx, ws, { projectId }))).length).toBeGreaterThan(3);
    expect(await as(bystander, (tx) => listTasks(tx, ws))).toEqual([]);
    expect(await as(outsider, (tx) => tx.select().from(tasks))).toEqual([]);
    // Assigned on a project they're not on: they see that task only.
    await as(owner, (tx) =>
      createTask(
        tx,
        ws,
        { projectId: otherProject, title: 'Example for Neha', assigneeId: bystander.userId },
        owner.userId,
      ),
    );
    expect((await as(bystander, (tx) => listTasks(tx, ws))).map((x) => x.title)).toEqual([
      'Example for Neha',
    ]);
  });

  it('lets only the team change tasks; deleting needs tasks.delete', async () => {
    await expect(
      as(bystander, (tx) => createTask(tx, ws, { projectId, title: 'X' }, bystander.userId)),
    ).rejects.toMatchObject(pgError(/row-level security/));
    const [first] = await as(member, (tx) => listTasks(tx, ws, { projectId }));
    await expect(
      as(bystander, (tx) => updateTask(tx, first!.id, { title: 'Nope' }, bystander.userId)),
    ).rejects.toMatchObject({ code: 'task_not_found' });
    const events = await as(member, (tx) =>
      updateTask(tx, first!.id, { assigneeId: lead.userId }, member.userId),
    );
    expect(events).toEqual([expect.objectContaining({ userIds: [lead.userId] })]);
    await expect(as(member, (tx) => deleteTask(tx, first!.id))).rejects.toMatchObject({
      code: 'no_access',
    });
    const parent = (await as(lead, (tx) => listTasks(tx, ws, { projectId }))).find(
      (x) => x.title === 'Example design',
    )!;
    await as(lead, (tx) => deleteTask(tx, parent.id));
    const all = await as(lead, (tx) => listTasks(tx, ws, { projectId, includeSubtasks: true }));
    expect(all.map((x) => x.title)).not.toContain('Example design');
    expect(all.map((x) => x.title)).not.toContain('Example home page');
  });
});

describe('comments', () => {
  it('posts comments, tells mentioned members, and lets authors edit or delete their own', async () => {
    const [first] = await as(member, (tx) => listTasks(tx, ws, { projectId }));
    const { id, events } = await as(member, (tx) =>
      addTaskComment(
        tx,
        {
          workspaceId: ws,
          taskId: first!.id,
          body: ' Can you check the spacing? ',
          mentions: [lead.userId, member.userId, outsider.userId],
        },
        member.userId,
      ),
    );
    expect(events).toEqual([
      expect.objectContaining({
        kind: 'task.assigned',
        userIds: [lead.userId],
        payload: expect.objectContaining({ reason: 'mentioned' }),
      }),
    ]);
    const list = await as(lead, (tx) => listComments(tx, ws, 'task', first!.id));
    expect(list).toEqual([
      expect.objectContaining({
        body: 'Can you check the spacing?',
        authorId: member.userId,
        mentions: [lead.userId],
      }),
    ]);
    await expect(
      as(lead, (tx) => editComment(tx, id, 'Edited by someone else')),
    ).rejects.toMatchObject({ code: 'comment_not_found' });
    await as(member, (tx) => editComment(tx, id, 'Can you check the spacing on mobile?'));
    expect((await as(lead, (tx) => listComments(tx, ws, 'task', first!.id)))[0]).toMatchObject({
      body: 'Can you check the spacing on mobile?',
    });
    expect(await as(bystander, (tx) => listComments(tx, ws, 'task', first!.id))).toEqual([]);
    await expect(
      as(bystander, (tx) =>
        addTaskComment(tx, { workspaceId: ws, taskId: first!.id, body: 'Hi' }, bystander.userId),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
    await expect(as(lead, (tx) => deleteComment(tx, id))).rejects.toMatchObject({
      code: 'comment_not_found',
    });
    await as(member, (tx) => deleteComment(tx, id));
  });
});

describe('daily updates and the team page', () => {
  it('saves one update per day and project, seen by the project lead and owners', async () => {
    await as(member, (tx) =>
      saveDailyUpdate(tx, ws, member.userId, {
        projectId,
        forDate: '2026-10-26',
        done: 'Wireframes',
        next: 'Copy',
        blockers: ' ',
      }),
    );
    await as(member, (tx) =>
      saveDailyUpdate(tx, ws, member.userId, {
        projectId,
        forDate: '2026-10-26',
        done: 'Wireframes and copy',
        next: 'Review',
      }),
    );
    const mine = await as(member, (tx) => dailyUpdatesFor(tx, ws, { forDate: '2026-10-26' }));
    expect(mine).toEqual([
      expect.objectContaining({ done: 'Wireframes and copy', next: 'Review', blockers: null }),
    ]);
    expect(await as(lead, (tx) => dailyUpdatesFor(tx, ws, { projectId }))).toHaveLength(1);
    expect(await as(owner, (tx) => dailyUpdatesFor(tx, ws))).toHaveLength(1);
    expect(await as(bystander, (tx) => dailyUpdatesFor(tx, ws))).toEqual([]);
    await expect(
      as(member, (tx) => saveDailyUpdate(tx, ws, member.userId, { forDate: '2026-10-27' })),
    ).rejects.toMatchObject({ code: 'daily_update_empty' });
    await expect(
      as(bystander, (tx) =>
        saveDailyUpdate(tx, ws, bystander.userId, { projectId, forDate: '2026-10-26', done: 'x' }),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
    await expect(
      as(member, (tx) =>
        saveDailyUpdate(tx, ws, lead.userId, { forDate: '2026-10-26', done: 'x' }),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
  });

  it('lists members with their projects and open tasks', async () => {
    const team = await as(member, (tx) => teamOverview(tx, ws));
    const row = (id: string) => team.find((m) => m.user_id === id)!;
    expect(team).toHaveLength(4);
    expect(row(lead.userId)).toMatchObject({ role: 'project_lead', projects: 1 });
    expect(row(member.userId)).toMatchObject({ role: 'member', projects: 1 });
    expect(row(member.userId).open_tasks).toBeGreaterThan(1);
    expect(row(bystander.userId)).toMatchObject({ projects: 0, open_tasks: 1 });
    expect(await as(outsider, (tx) => teamOverview(tx, ws))).toEqual([]);
  });
});
