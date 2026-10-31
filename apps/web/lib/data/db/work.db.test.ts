// Runs the project and task screens' data functions against a real Postgres (TEST_DATABASE_URL),
// as a member, with RLS: the same path the pages take once signed in.
import { createClient, createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import {
  addCommentFor,
  addSubtaskFor,
  createProjectFor,
  createTaskFor,
  myName,
  peopleOf,
  projectChoices,
  projectDetail,
  projectList,
  requestGateFor,
  setTaskStatusFor,
  taskDetail,
  taskList,
  toggleSubtaskFor,
  updateTaskFor,
} from './work';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let ctx: WorkspaceCtx;
let other: WorkspaceCtx;
let client: string;
let project: string;
const now = new Date('2026-10-27T06:00:00Z');

run('projects and tasks on the database', () => {
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
    client = await as(owner, (tx) =>
      createClient(
        tx,
        ws,
        {
          name: 'Example Acme Labs',
          contact: { name: 'Example Srinivas', email: 'srinivas@acme.example' },
        },
        owner.userId,
      ),
    );
    ctx = {
      db: t.db,
      session: owner,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'free',
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

  it('starts a project from the seven phases, led by the member picked by name', async () => {
    expect(await peopleOf(ctx)).toEqual(['Kiran Rao']);
    expect(await myName(ctx)).toBe('Kiran Rao');
    project = await createProjectFor(ctx, {
      name: 'Website redesign',
      clientId: client,
      template: 'seven_phases',
      lead: 'Kiran Rao',
      budgetMinor: 8_000_000n,
      startOn: '2026-10-20',
      dueOn: '2026-12-15',
    });
    const [row] = await projectList(ctx, now);
    expect(row!.client.name).toBe('Example Acme Labs');
    expect(row!.project).toMatchObject({
      id: project,
      lead: 'Kiran Rao',
      template: 'seven_phases',
      phase: 0,
      budgetMinor: 8_000_000n,
      dueOn: '2026-12-15',
      gate: null,
    });
    const found = (await projectDetail(ctx, project, now))!;
    expect(found.project.activities.map((a) => a.text)).toEqual(['started the project']);
  });

  it('asks the client for the current phase’s sign-off', async () => {
    await requestGateFor(ctx, project, 'Discovery notes');
    const { project: p } = (await projectDetail(ctx, project, now))!;
    expect(p.gate).toMatchObject({ status: 'waiting', approver: 'Example Srinivas' });
    expect(p.gate!.sentAt).not.toBeNull();
  });

  it('adds, edits and moves tasks, with subtasks, comments and mentions', async () => {
    const [choice] = await projectChoices(ctx);
    expect(choice).toMatchObject({ id: project, name: 'Example Acme Labs · Website redesign' });
    const phase = choice!.phases[1]!;
    const id = await createTaskFor(ctx, {
      title: 'Homepage wireframe',
      projectId: project,
      phase,
      assignee: 'Kiran Rao',
      dueOn: '2026-10-25',
      priority: 'high',
      status: 'todo',
      description: '',
    });
    await addSubtaskFor(ctx, id, 'Mobile layout');
    const sub = (await taskDetail(ctx, id))!.task.subtasks[0]!;
    await toggleSubtaskFor(ctx, sub.id, true);
    expect(await addCommentFor(ctx, id, 'Looks good @Kiran Rao')).toEqual([]);
    await setTaskStatusFor(ctx, id, 'in_progress');

    const [item] = await taskList(ctx, { projectId: project });
    expect(item).toMatchObject({ client: 'Example Acme Labs', comments: 1 });
    expect(item!.task).toMatchObject({
      phase,
      assignee: 'Kiran Rao',
      status: 'in_progress',
      priority: 'high',
      subtasks: [{ title: 'Mobile layout', done: true }],
    });
    expect(await taskList(ctx, { assignee: 'Kiran Rao' })).toHaveLength(1);
    expect(await taskList(ctx, { assignee: 'Someone else' })).toEqual([]);

    // A late open task puts the project at risk.
    expect((await projectDetail(ctx, project, now))!.late).toBe(1);

    await updateTaskFor(ctx, id, {
      title: 'Homepage wireframe, v2',
      projectId: project,
      phase: null,
      assignee: 'Kiran Rao',
      dueOn: null,
      priority: 'normal',
      status: 'done',
      description: 'Desktop and mobile',
    });
    const page = (await taskDetail(ctx, id))!;
    expect(page.task).toMatchObject({
      title: 'Homepage wireframe, v2',
      phase: null,
      status: 'done',
      description: 'Desktop and mobile',
    });
    expect(page.task.comments).toMatchObject([{ who: 'Kiran Rao', text: 'Looks good @Kiran Rao' }]);
    expect(page.client.name).toBe('Example Acme Labs');
    expect((await projectDetail(ctx, project, now))!.late).toBe(0);
  });

  it('shows none of it to another workspace', async () => {
    const id = (await taskList(ctx))[0]!.task.id;
    expect(await projectList(other, now)).toEqual([]);
    expect(await projectDetail(other, project, now)).toBeNull();
    expect(await taskList(other)).toEqual([]);
    expect(await taskDetail(other, id)).toBeNull();
    await expect(setTaskStatusFor(other, id, 'todo')).rejects.toThrow();
    await expect(requestGateFor(other, project, 'Anything')).rejects.toThrow();
  });
});
