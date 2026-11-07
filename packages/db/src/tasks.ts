import { positionBetween } from '@agency-os/core';
import { and, asc, eq, gte, inArray, isNull, lte, ne, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import type { NotificationEvent } from './projects';
import { comments, dailyUpdates, memberships, projects, tasks } from './schema';

export type Task = typeof tasks.$inferSelect;
export type TaskStatus = Task['status'];
export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

export type NewTask = {
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  dueOn?: string | null;
  priority?: Task['priority'];
  status?: TaskStatus;
  phaseId?: string | null;
  parentTaskId?: string | null;
  isExample?: boolean;
};

async function bottomOf(tx: Tx, projectId: string, status: TaskStatus) {
  const [last] = await tx
    .select({ position: tasks.position })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status)))
    .orderBy(sql`${tasks.position} desc`)
    .limit(1);
  return positionBetween(last?.position ?? null, null);
}

function assigned(
  task: Pick<Task, 'id' | 'workspaceId' | 'title' | 'projectId'>,
  assigneeId: string | null | undefined,
  actorId: string,
): NotificationEvent[] {
  if (!assigneeId || assigneeId === actorId) return [];
  return [
    {
      kind: 'task.assigned',
      workspaceId: task.workspaceId,
      userIds: [assigneeId],
      contactEmails: [],
      payload: { taskId: task.id, task: task.title, projectId: task.projectId, reason: 'assigned' },
    },
  ];
}

/** Adds a task at the bottom of its column. Returns the assignee's notification, if any. */
export async function createTask(tx: Tx, workspaceId: string, input: NewTask, actorId: string) {
  const title = input.title.trim();
  if (!title) throw new AccountError('task_title_required');
  const status = input.status ?? 'todo';
  const id = uuidv7();
  const position = await bottomOf(tx, input.projectId, status);
  await call(() =>
    tx.insert(tasks).values({
      id,
      workspaceId,
      projectId: input.projectId,
      phaseId: input.phaseId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      title,
      description: input.description ?? null,
      assigneeId: input.assigneeId ?? null,
      dueOn: input.dueOn ?? null,
      priority: input.priority ?? 'normal',
      status,
      position,
      isExample: input.isExample ?? false,
      createdBy: actorId,
    }),
  );
  return {
    id,
    events: assigned(
      { id, workspaceId, title, projectId: input.projectId },
      input.assigneeId,
      actorId,
    ),
  };
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'description' | 'assigneeId' | 'dueOn' | 'priority' | 'phaseId'>
>;

export async function updateTask(tx: Tx, taskId: string, patch: TaskPatch, actorId: string) {
  const [before] = await tx.select().from(tasks).where(eq(tasks.id, taskId));
  if (!before) throw new AccountError('task_not_found');
  const rows = await call(() =>
    tx
      .update(tasks)
      .set({ ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() } : {}) })
      .where(eq(tasks.id, taskId))
      .returning(),
  );
  if (rows.length === 0) throw new AccountError('task_not_found');
  return patch.assigneeId !== undefined && patch.assigneeId !== before.assigneeId
    ? assigned(rows[0]!, patch.assigneeId, actorId)
    : [];
}

/** Board drag: a new status and/or a place between two neighbours in that column. */
export async function moveTask(
  tx: Tx,
  move: { taskId: string; status: TaskStatus; before?: string | null; after?: string | null },
) {
  const [task] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, move.taskId), isNull(tasks.deletedAt)));
  if (!task) throw new AccountError('task_not_found');
  let position: string;
  if (move.before === undefined && move.after === undefined) {
    position =
      task.status === move.status ? task.position : await bottomOf(tx, task.projectId, move.status);
  } else {
    const ids = [move.before, move.after].filter((x): x is string => !!x);
    const rows = ids.length
      ? await tx
          .select({ id: tasks.id, position: tasks.position })
          .from(tasks)
          .where(inArray(tasks.id, ids))
      : [];
    const pos = (id?: string | null) =>
      id ? (rows.find((r) => r.id === id)?.position ?? null) : null;
    const a = pos(move.before);
    const b = pos(move.after);
    position =
      a !== null && b !== null && a >= b ? positionBetween(a, null) : positionBetween(a, b);
  }
  const rows = await call(() =>
    tx
      .update(tasks)
      .set({ status: move.status, position })
      .where(eq(tasks.id, move.taskId))
      .returning({ id: tasks.id }),
  );
  if (rows.length === 0) throw new AccountError('task_not_found');
}

/** Soft delete (with its subtasks); needs tasks.delete on the project. */
export async function deleteTask(tx: Tx, taskId: string, at: Date | null = new Date()) {
  const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new AccountError('task_not_found');
  const [ok] = await tx.execute<{ ok: boolean }>(
    sql`select can_project(${task.workspaceId}::uuid, ${task.projectId}::uuid, 'tasks.delete') as ok`,
  );
  if (!ok?.ok) throw new AccountError('no_access');
  await tx
    .update(tasks)
    .set({ deletedAt: at })
    .where(sql`${tasks.id} = ${taskId} or ${tasks.parentTaskId} = ${taskId}`);
}

export type TaskFilters = {
  projectId?: string;
  assigneeId?: string;
  statuses?: TaskStatus[];
  phaseId?: string;
  /** For the calendar: due between these dates (inclusive). */
  dueFrom?: string;
  dueTo?: string;
  /** Subtasks are listed under their parent unless asked for. */
  includeSubtasks?: boolean;
};

export async function listTasks(tx: Tx, workspaceId: string, f: TaskFilters = {}) {
  return tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt),
        f.projectId ? eq(tasks.projectId, f.projectId) : undefined,
        f.assigneeId ? eq(tasks.assigneeId, f.assigneeId) : undefined,
        f.statuses?.length ? inArray(tasks.status, f.statuses) : undefined,
        f.phaseId ? eq(tasks.phaseId, f.phaseId) : undefined,
        f.dueFrom ? gte(tasks.dueOn, f.dueFrom) : undefined,
        f.dueTo ? lte(tasks.dueOn, f.dueTo) : undefined,
        f.includeSubtasks ? undefined : isNull(tasks.parentTaskId),
      ),
    )
    .orderBy(sql`${tasks.dueOn} asc nulls last`, asc(tasks.position), asc(tasks.id));
}

/** The project board: the four columns in order. */
export async function taskBoard(tx: Tx, workspaceId: string, projectId: string) {
  const rows = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.projectId, projectId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
      ),
    )
    .orderBy(asc(tasks.position), asc(tasks.id));
  return TASK_STATUSES.map((status) => ({
    status,
    tasks: rows.filter((r) => r.status === status),
  }));
}

/** My tasks: open tasks assigned to me across projects, soonest due first. */
export async function myTasks(
  tx: Tx,
  workspaceId: string,
  userId: string,
  { dueBy }: { dueBy?: string } = {},
) {
  return tx
    .select({ task: tasks, projectName: projects.name })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        ne(tasks.status, 'done'),
        dueBy ? lte(tasks.dueOn, dueBy) : undefined,
      ),
    )
    .orderBy(sql`${tasks.dueOn} asc nulls last`, asc(tasks.id));
}

/** One task (not in the trash), or null when it doesn't exist or RLS hides it. */
export async function getTask(tx: Tx, taskId: string): Promise<Task | null> {
  const [task] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
  return task ?? null;
}

export async function subtasks(tx: Tx, taskId: string) {
  return tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, taskId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.position));
}

// ---- Comments ----

/** Comments on a task; mentioned members (of the workspace) are told. */
export async function addTaskComment(
  tx: Tx,
  input: { workspaceId: string; taskId: string; body: string; mentions?: string[] },
  actorId: string,
) {
  const body = input.body.trim();
  if (!body) throw new AccountError('comment_required');
  const wanted = [...new Set(input.mentions ?? [])].filter((m) => m !== actorId);
  const members = wanted.length
    ? (
        await tx
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(
            and(
              eq(memberships.workspaceId, input.workspaceId),
              inArray(memberships.userId, wanted),
              eq(memberships.status, 'active'),
            ),
          )
      ).map((m) => m.userId)
    : [];
  const id = uuidv7();
  await call(() =>
    tx.insert(comments).values({
      id,
      workspaceId: input.workspaceId,
      subjectType: 'task',
      subjectId: input.taskId,
      authorId: actorId,
      body,
      mentions: members,
    }),
  );
  const [task] = await tx
    .select({ title: tasks.title, projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, input.taskId));
  const events: NotificationEvent[] = members.length
    ? [
        {
          kind: 'task.assigned',
          workspaceId: input.workspaceId,
          userIds: members,
          contactEmails: [],
          payload: {
            taskId: input.taskId,
            task: task?.title,
            projectId: task?.projectId,
            reason: 'mentioned',
            commentId: id,
          },
        },
      ]
    : [];
  return { id, events };
}

export async function listComments(
  tx: Tx,
  workspaceId: string,
  subjectType: string,
  subjectId: string,
) {
  return tx
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.workspaceId, workspaceId),
        eq(comments.subjectType, subjectType),
        eq(comments.subjectId, subjectId),
      ),
    )
    .orderBy(asc(comments.createdAt), asc(comments.id));
}

/** How many comments each subject has, in one query (for lists). */
export async function commentCounts(
  tx: Tx,
  workspaceId: string,
  subjectType: string,
  subjectIds: string[],
): Promise<Map<string, number>> {
  if (subjectIds.length === 0) return new Map();
  const rows = await tx
    .select({ subjectId: comments.subjectId, n: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(
        eq(comments.workspaceId, workspaceId),
        eq(comments.subjectType, subjectType),
        inArray(comments.subjectId, subjectIds),
      ),
    )
    .groupBy(comments.subjectId);
  return new Map(rows.map((r) => [r.subjectId, r.n]));
}

export async function editComment(tx: Tx, commentId: string, body: string) {
  const text = body.trim();
  if (!text) throw new AccountError('comment_required');
  const rows = await tx
    .update(comments)
    .set({ body: text, editedAt: new Date() })
    .where(eq(comments.id, commentId))
    .returning({ id: comments.id });
  if (rows.length === 0) throw new AccountError('comment_not_found');
}

export async function deleteComment(tx: Tx, commentId: string) {
  const rows = await tx
    .delete(comments)
    .where(eq(comments.id, commentId))
    .returning({ id: comments.id });
  if (rows.length === 0) throw new AccountError('comment_not_found');
}

// ---- Daily updates and team ----

export type DailyUpdateInput = {
  projectId?: string | null;
  forDate: string;
  done?: string | null;
  next?: string | null;
  blockers?: string | null;
};

/** Saves (or replaces) the signed-in member's update for a day and project. */
export async function saveDailyUpdate(
  tx: Tx,
  workspaceId: string,
  userId: string,
  input: DailyUpdateInput,
) {
  const clean = (s?: string | null) => s?.trim() || null;
  const values = {
    done: clean(input.done),
    next: clean(input.next),
    blockers: clean(input.blockers),
  };
  if (!values.done && !values.next && !values.blockers)
    throw new AccountError('daily_update_empty');
  const [existing] = await tx
    .select({ id: dailyUpdates.id })
    .from(dailyUpdates)
    .where(
      and(
        eq(dailyUpdates.userId, userId),
        eq(dailyUpdates.forDate, input.forDate),
        input.projectId
          ? eq(dailyUpdates.projectId, input.projectId)
          : isNull(dailyUpdates.projectId),
      ),
    );
  if (existing) {
    await call(() => tx.update(dailyUpdates).set(values).where(eq(dailyUpdates.id, existing.id)));
    return existing.id;
  }
  const id = uuidv7();
  await call(() =>
    tx.insert(dailyUpdates).values({
      id,
      workspaceId,
      userId,
      projectId: input.projectId ?? null,
      forDate: input.forDate,
      ...values,
    }),
  );
  return id;
}

/** Updates the caller may read (their own; a project's for its lead; all for people managers). */
export async function dailyUpdatesFor(
  tx: Tx,
  workspaceId: string,
  f: { projectId?: string; forDate?: string; userId?: string } = {},
) {
  return tx
    .select()
    .from(dailyUpdates)
    .where(
      and(
        eq(dailyUpdates.workspaceId, workspaceId),
        f.projectId ? eq(dailyUpdates.projectId, f.projectId) : undefined,
        f.forDate ? eq(dailyUpdates.forDate, f.forDate) : undefined,
        f.userId ? eq(dailyUpdates.userId, f.userId) : undefined,
      ),
    )
    .orderBy(sql`${dailyUpdates.forDate} desc`, asc(dailyUpdates.createdAt));
}

export type TeamMember = {
  user_id: string;
  name: string | null;
  role: string;
  status: string;
  projects: number;
  open_tasks: number;
};

export async function teamOverview(tx: Tx, workspaceId: string): Promise<TeamMember[]> {
  return [
    ...(await tx.execute<TeamMember>(sql`select * from team_overview(${workspaceId}::uuid)`)),
  ];
}
