// Server only. Projects and tasks on the database, in the shapes the screens use (see ../index.ts
// and ../tasks.ts for the example-mode versions). Every query runs as the member, with RLS.
import { SEVEN_PHASES } from '@agency-os/core';
import {
  AccountError,
  addTaskComment,
  commentCounts,
  createProject as dbCreateProject,
  createTask as dbCreateTask,
  getClient as dbGetClient,
  getProject as dbGetProject,
  getTask as dbGetTask,
  listClients,
  listComments,
  listMembers,
  listProjects,
  listTasks,
  moveTask,
  phaseNames as dbPhaseNames,
  projectActivities,
  requestGateApproval,
  subtasks as dbSubtasks,
  updateTask as dbUpdateTask,
  deliverEvent,
  withService,
  type NotificationEvent,
  type Tx,
} from '@agency-os/db';
import type { ProjectInput, TaskInput } from '../../forms';
import { emailsQueued } from '../../server/jobs';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import type { Activity, Client, GateDecision, GateStatus, Project, Task } from '../types';
import { istDate, mentions } from '../views';
import { clientFromDb } from './map';

type DbProject = NonNullable<Awaited<ReturnType<typeof dbGetProject>>>;
type DbClient = NonNullable<Awaited<ReturnType<typeof dbGetClient>>>;

// ---------- Members ----------

async function members(tx: Tx, workspaceId: string) {
  const rows = await listMembers(tx, workspaceId);
  const byId = new Map(rows.map((m) => [m.userId, m.name ?? 'A former member']));
  return {
    name: (id: string | null) => (id ? (byId.get(id) ?? 'A former member') : 'Nobody yet'),
    /** Names in the forms are members' names; the first member with that name. */
    idOf: (name: string) =>
      rows.find((m) => m.status === 'active' && m.name === name)?.userId ?? null,
    names: rows.filter((m) => m.status === 'active' && m.name).map((m) => m.name!),
  };
}

type Members = Awaited<ReturnType<typeof members>>;

/** The active members' names, for the lead and assignee pickers. */
export async function peopleOf(ctx: WorkspaceCtx): Promise<string[]> {
  return asMember(ctx, async (tx) => (await members(tx, ctx.workspaceId)).names);
}

/** One member by user id, for links like "this person's tasks". */
export async function memberById(ctx: WorkspaceCtx, userId: string) {
  return asMember(ctx, async (tx) => {
    const m = (await listMembers(tx, ctx.workspaceId)).find((x) => x.userId === userId);
    return m ? { id: m.userId, name: m.name ?? 'A former member' } : null;
  });
}

/** The signed-in member's name, for "My tasks". */
export async function myName(ctx: WorkspaceCtx): Promise<string> {
  return asMember(ctx, async (tx) => (await members(tx, ctx.workspaceId)).name(ctx.session.userId));
}

// ---------- Notifications ----------

/**
 * Puts the in-app notifications for what the member just did (an assignment, a mention, a
 * sign-off request) in the recipients' lists, once the change is saved. The database works out
 * who; delivering takes the service role, as members can't write each other's notifications.
 * Emails for them go out with the job runner (Inngest) and Resend.
 */
/** In-app notifications now; emails into the outbox, nudged to go out straight away. */
async function deliver(ctx: WorkspaceCtx, events: NotificationEvent[]) {
  const due = events.filter((e) => e.userIds.length || e.contactEmails.length);
  for (const event of due)
    await withService(ctx.db, ctx.workspaceId, (tx) => deliverEvent(tx, event));
  if (due.length) await emailsQueued(ctx.workspaceId);
}

// ---------- Projects ----------

const GATE_STATUS: Partial<Record<string, GateStatus>> = {
  waiting: 'waiting',
  approved: 'approved',
  changes_requested: 'changes',
};

/** The phase in progress: the first one not done or skipped (the last when all are). */
function currentPhase(p: DbProject): number {
  const index = p.phases.findIndex((ph) => ph.status !== 'done' && ph.status !== 'skipped');
  return index === -1 ? Math.max(p.phases.length - 1, 0) : index;
}

function projectFromDb(p: DbProject, client: DbClient, people: Members): Project {
  const contactName = (id: string | null) =>
    client.contacts.find((c) => c.id === id)?.name ?? client.contacts[0]?.name ?? client.name;
  const approverOf = (g: NonNullable<DbProject['phases'][number]['gate']>) =>
    g.approverType === 'client' ? contactName(g.approverContactId) : people.name(g.approverUserId);
  const index = currentPhase(p);
  const gate = p.phases[index]?.gate ?? null;
  const status = gate ? GATE_STATUS[gate.status] : undefined;
  const history: GateDecision[] = p.phases
    .flatMap((ph) => (ph.gate?.decidedAt ? [{ phase: ph.name, gate: ph.gate }] : []))
    .filter(({ gate: g }) => g.status === 'approved' || g.status === 'changes_requested')
    .map(({ phase, gate: g }) => ({
      title: g.title,
      phase,
      decision: g.status === 'approved' ? ('approved' as const) : ('changes' as const),
      by: g.decidedByContactId ? contactName(g.decidedByContactId) : people.name(g.decidedBy),
      comment: g.decisionComment,
      at: g.decidedAt!.toISOString(),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
  const created = istDate(p.createdAt.toISOString());
  return {
    id: p.id,
    name: p.name,
    clientId: p.clientId,
    lead: people.name(p.leadMemberId),
    template: p.templateName === SEVEN_PHASES.name ? 'seven_phases' : 'blank',
    phase: index,
    budgetMinor: p.budgetMinor ?? 0n,
    // Time and costs against the budget come later; nothing is counted as used yet.
    usedMinor: 0n,
    startOn: p.startOn ?? created,
    dueOn: p.dueOn ?? p.startOn ?? created,
    gate:
      gate && status
        ? {
            title: gate.title,
            status,
            approver: approverOf(gate),
            sentAt: gate.requestedAt?.toISOString() ?? null,
          }
        : null,
    gateHistory: history,
    activities: [],
    createdAt: p.createdAt.toISOString(),
    example: p.isExample || undefined,
  };
}

async function lateTasks(tx: Tx, workspaceId: string, now: Date) {
  const today = istDate(now.toISOString());
  const rows = await listTasks(tx, workspaceId, { statuses: ['todo', 'in_progress', 'in_review'] });
  const late = new Map<string, number>();
  for (const t of rows)
    if (t.dueOn && t.dueOn < today) late.set(t.projectId, (late.get(t.projectId) ?? 0) + 1);
  return late;
}

export type ProjectWithClient = { project: Project; client: Client; late: number };

export async function projectList(ctx: WorkspaceCtx, now = new Date()) {
  return asMember(ctx, async (tx) => {
    const [rows, people, late] = await Promise.all([
      listProjects(tx, ctx.workspaceId),
      members(tx, ctx.workspaceId),
      lateTasks(tx, ctx.workspaceId, now),
    ]);
    const out: ProjectWithClient[] = [];
    for (const row of rows) {
      const [p, c] = await Promise.all([dbGetProject(tx, row.id), dbGetClient(tx, row.clientId)]);
      if (!p || !c) continue;
      out.push({
        project: projectFromDb(p, c, people),
        client: clientFromDb(c),
        late: late.get(p.id) ?? 0,
      });
    }
    return out;
  });
}

export async function projectDetail(
  ctx: WorkspaceCtx,
  id: string,
  now = new Date(),
): Promise<ProjectWithClient | null> {
  return asMember(ctx, async (tx) => {
    const p = await dbGetProject(tx, id);
    if (!p || p.workspaceId !== ctx.workspaceId || p.deletedAt) return null;
    const [c, people, late, activity] = await Promise.all([
      dbGetClient(tx, p.clientId),
      members(tx, ctx.workspaceId),
      lateTasks(tx, ctx.workspaceId, now),
      projectActivities(tx, ctx.workspaceId, id),
    ]);
    if (!c) return null;
    const project = projectFromDb(p, c, people);
    project.activities = activity.flatMap<Activity>((a) =>
      a.kind === 'created'
        ? [
            {
              id: a.id,
              kind: 'created',
              who: people.name(a.actorId),
              text: 'started the project',
              at: a.createdAt.toISOString(),
            },
          ]
        : [],
    );
    return { project, client: clientFromDb(c), late: late.get(p.id) ?? 0 };
  });
}

export async function createProjectFor(ctx: WorkspaceCtx, input: ProjectInput): Promise<string> {
  return asMember(ctx, async (tx) => {
    const people = await members(tx, ctx.workspaceId);
    return dbCreateProject(
      tx,
      ctx.workspaceId,
      {
        clientId: input.clientId,
        name: input.name,
        template: input.template,
        budgetMinor: input.budgetMinor,
        startOn: input.startOn,
        dueOn: input.dueOn,
        leadMemberId: people.idOf(input.lead) ?? ctx.session.userId,
      },
      ctx.session.userId,
    );
  });
}

/**
 * Asks for the current phase's sign-off. The gate's title comes from the template; when the
 * lead words it differently, that goes with the request as its message. An internal approver
 * sees it in the app; the email to the client waits for the job runner (Inngest) and Resend.
 */
export async function requestGateFor(ctx: WorkspaceCtx, id: string, title: string) {
  const event = await asMember(ctx, async (tx) => {
    const p = await dbGetProject(tx, id);
    if (!p || p.workspaceId !== ctx.workspaceId) throw new AccountError('project_not_found');
    const gate = p.phases[currentPhase(p)]?.gate;
    if (!gate) throw new AccountError('gate_not_found');
    return requestGateApproval(tx, gate.id, title === gate.title ? undefined : title);
  });
  await deliver(ctx, [event]);
}

// ---------- Tasks ----------

async function projectNames(tx: Tx, workspaceId: string) {
  const [projects, clients] = await Promise.all([
    listProjects(tx, workspaceId),
    listClients(tx, workspaceId, { limit: 1000 }),
  ]);
  return new Map(
    projects.map((p) => [
      p.id,
      { name: p.name, client: clients.find((c) => c.id === p.clientId)?.name ?? '' },
    ]),
  );
}

export type TaskListItem = { task: Task; client: string; comments: number };

/** Top-level tasks with their subtask and comment counts, in the screens' shape. */
export async function taskList(
  ctx: WorkspaceCtx,
  filter: { projectId?: string; assignee?: string } = {},
): Promise<TaskListItem[]> {
  return asMember(ctx, async (tx) => {
    const people = await members(tx, ctx.workspaceId);
    const assigneeId = filter.assignee ? people.idOf(filter.assignee) : undefined;
    if (filter.assignee && !assigneeId) return [];
    const [rows, all, names] = await Promise.all([
      listTasks(tx, ctx.workspaceId, {
        projectId: filter.projectId,
        assigneeId: assigneeId ?? undefined,
      }),
      listTasks(tx, ctx.workspaceId, { includeSubtasks: true }),
      projectNames(tx, ctx.workspaceId),
    ]);
    const [phases, counts] = await Promise.all([
      dbPhaseNames(tx, [...new Set(rows.map((t) => t.projectId))]),
      commentCounts(
        tx,
        ctx.workspaceId,
        'task',
        rows.map((t) => t.id),
      ),
    ]);
    return rows.map((t) => ({
      task: {
        ...taskFromDb(t, people, phases),
        subtasks: all
          .filter((s) => s.parentTaskId === t.id)
          .map((s) => ({ id: s.id, title: s.title, done: s.status === 'done' })),
      },
      client: names.get(t.projectId)?.client ?? '',
      comments: counts.get(t.id) ?? 0,
    }));
  });
}

function taskFromDb(
  t: NonNullable<Awaited<ReturnType<typeof dbGetTask>>>,
  people: Members,
  phaseNames: Map<string, string>,
): Task {
  return {
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    phase: t.phaseId ? (phaseNames.get(t.phaseId) ?? null) : null,
    assignee: people.name(t.assigneeId),
    dueOn: t.dueOn,
    priority: t.priority,
    status: t.status,
    description: t.description ?? '',
    subtasks: [],
    comments: [],
    createdAt: t.createdAt.toISOString(),
    example: t.isExample || undefined,
  };
}

/** The task page: the task with its subtasks and comments, its project and the client. */
export async function taskDetail(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, async (tx) => {
    const t = await dbGetTask(tx, id);
    if (!t || t.workspaceId !== ctx.workspaceId) return null;
    const [people, p] = await Promise.all([
      members(tx, ctx.workspaceId),
      dbGetProject(tx, t.projectId),
    ]);
    if (!p) return null;
    const c = await dbGetClient(tx, p.clientId);
    if (!c) return null;
    const [subs, notes] = await Promise.all([
      dbSubtasks(tx, id),
      listComments(tx, ctx.workspaceId, 'task', id),
    ]);
    const task: Task = {
      ...taskFromDb(t, people, new Map(p.phases.map((ph) => [ph.id, ph.name]))),
      subtasks: subs.map((s) => ({ id: s.id, title: s.title, done: s.status === 'done' })),
      comments: notes.map((n) => ({
        id: n.id,
        who: people.name(n.authorId),
        text: n.body,
        at: n.createdAt.toISOString(),
      })),
    };
    return { task, project: projectFromDb(p, c, people), client: clientFromDb(c) };
  });
}

/** Projects to pick from, with their phase names (from the database, not the template). */
export async function projectChoices(ctx: WorkspaceCtx) {
  return asMember(ctx, async (tx) => {
    const [rows, names] = await Promise.all([
      listProjects(tx, ctx.workspaceId),
      projectNames(tx, ctx.workspaceId),
    ]);
    const phases = await Promise.all(rows.map((r) => dbGetProject(tx, r.id)));
    return rows.map((r, i) => ({
      id: r.id,
      name: `${names.get(r.id)?.client ?? ''} · ${r.name}`,
      template: (r.templateName === SEVEN_PHASES.name ? 'seven_phases' : 'blank') as
        'seven_phases' | 'blank',
      phases: phases[i]?.phases.map((ph) => ph.name) ?? [],
    }));
  });
}

async function taskFields(tx: Tx, ctx: WorkspaceCtx, input: TaskInput) {
  const [people, p] = await Promise.all([
    members(tx, ctx.workspaceId),
    dbGetProject(tx, input.projectId),
  ]);
  if (!p || p.workspaceId !== ctx.workspaceId) throw new AccountError('project_not_found');
  return {
    title: input.title,
    description: input.description || null,
    assigneeId: people.idOf(input.assignee),
    dueOn: input.dueOn,
    priority: input.priority,
    phaseId: p.phases.find((ph) => ph.name === input.phase)?.id ?? null,
  };
}

/** Adds a task; the assignee (if someone else) is told in the app. */
export async function createTaskFor(ctx: WorkspaceCtx, input: TaskInput): Promise<string> {
  const { id, events } = await asMember(ctx, async (tx) => {
    const fields = await taskFields(tx, ctx, input);
    return dbCreateTask(
      tx,
      ctx.workspaceId,
      { projectId: input.projectId, status: input.status, ...fields },
      ctx.session.userId,
    );
  });
  await deliver(ctx, events);
  return id;
}

export async function updateTaskFor(ctx: WorkspaceCtx, id: string, input: TaskInput) {
  const events = await asMember(ctx, async (tx) => {
    const assigned = await dbUpdateTask(
      tx,
      id,
      await taskFields(tx, ctx, input),
      ctx.session.userId,
    );
    const t = await dbGetTask(tx, id);
    if (t && t.status !== input.status) await moveTask(tx, { taskId: id, status: input.status });
    return assigned;
  });
  await deliver(ctx, events);
}

export async function setTaskStatusFor(ctx: WorkspaceCtx, id: string, status: Task['status']) {
  return asMember(ctx, (tx) => moveTask(tx, { taskId: id, status }));
}

export async function addSubtaskFor(ctx: WorkspaceCtx, id: string, title: string) {
  return asMember(ctx, async (tx) => {
    const parent = await dbGetTask(tx, id);
    if (!parent || parent.workspaceId !== ctx.workspaceId) throw new AccountError('task_not_found');
    await dbCreateTask(
      tx,
      ctx.workspaceId,
      { projectId: parent.projectId, parentTaskId: id, title, phaseId: parent.phaseId },
      ctx.session.userId,
    );
  });
}

export async function toggleSubtaskFor(ctx: WorkspaceCtx, subtaskId: string, done: boolean) {
  return asMember(ctx, (tx) => moveTask(tx, { taskId: subtaskId, status: done ? 'done' : 'todo' }));
}

/** Adds a comment; the people it mentions are told in the app. Returns their names. */
export async function addCommentFor(ctx: WorkspaceCtx, id: string, text: string) {
  const { named, events } = await asMember(ctx, async (tx) => {
    const people = await members(tx, ctx.workspaceId);
    const named = mentions(text, people.names);
    const { events } = await addTaskComment(
      tx,
      {
        workspaceId: ctx.workspaceId,
        taskId: id,
        body: text,
        mentions: named.flatMap((n) => people.idOf(n) ?? []),
      },
      ctx.session.userId,
    );
    const me = people.name(ctx.session.userId);
    return { named: named.filter((n) => n !== me), events };
  });
  await deliver(ctx, events);
  return named;
}
