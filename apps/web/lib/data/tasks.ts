// Server only. Tasks: the board, my tasks, task detail, subtasks and comments.
import type { TaskInput } from '../forms';
import { ctxFor } from './ctx';
import * as dbWork from './db/work';
import { notify } from './notifications';
import { EXAMPLE_USER, newId, store } from './shared';
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskStatus } from './types';
import { phaseNames } from './project-phases';
import { mentions, taskDue } from './views';

export type TaskRow = {
  id: string;
  title: string;
  project: string;
  projectId: string;
  assignee: string;
  due: string;
  /** YYYY-MM-DD, for the calendar. */
  dueOn: string | null;
  overdue: boolean;
  priority: 'Low' | 'Normal' | 'High';
  status: 'To do' | 'In progress' | 'In review' | 'Done';
  subtasks: string | null;
  comments: number;
};

function row(t: Task, now: Date, client?: string, comments?: number): TaskRow {
  const project = store().projects.find((p) => p.id === t.projectId);
  client ??= store().clients.find((c) => c.id === project?.clientId)?.name;
  const due = taskDue(t.dueOn, t.status === 'done', now);
  const done = t.subtasks.filter((s) => s.done).length;
  return {
    id: t.id,
    title: t.title,
    project: [client, t.phase].filter(Boolean).join(' · '),
    projectId: t.projectId,
    assignee: t.assignee,
    due: due.text,
    dueOn: t.dueOn,
    overdue: due.overdue,
    priority: TASK_PRIORITIES.find((p) => p.id === t.priority)!.name as TaskRow['priority'],
    status: TASK_STATUSES.find((s) => s.id === t.status)!.name as TaskRow['status'],
    subtasks: t.subtasks.length ? `${done}/${t.subtasks.length}` : null,
    comments: comments ?? t.comments.length,
  };
}

export async function tasks(
  filter: { projectId?: string; assignee?: string } = {},
  slug?: string,
): Promise<TaskRow[]> {
  const now = new Date();
  const ctx = await ctxFor(slug);
  if (ctx)
    return (await dbWork.taskList(ctx, filter)).map((t) => row(t.task, now, t.client, t.comments));
  return store()
    .tasks.filter(
      (t) =>
        (!filter.projectId || t.projectId === filter.projectId) &&
        (!filter.assignee || t.assignee === filter.assignee),
    )
    .map((t) => row(t, now));
}

export async function getTask(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) {
    const found = await dbWork.taskDetail(ctx, id);
    return found
      ? { ...found, due: taskDue(found.task.dueOn, found.task.status === 'done') }
      : null;
  }
  const task = store().tasks.find((t) => t.id === id);
  if (!task) return null;
  const project = store().projects.find((p) => p.id === task.projectId)!;
  const client = store().clients.find((c) => c.id === project.clientId)!;
  return { task, project, client, due: taskDue(task.dueOn, task.status === 'done') };
}

/** Projects to pick from, with their phase names. */
export async function projectOptions(slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.projectChoices(ctx);
  return store().projects.map((p) => {
    const client = store().clients.find((c) => c.id === p.clientId);
    return {
      id: p.id,
      name: `${client?.name ?? ''} · ${p.name}`,
      template: p.template,
      phases: phaseNames(p.template),
    };
  });
}

export async function createTask(input: TaskInput, slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.createTaskFor(ctx, input);
  const id = newId('task');
  store().tasks.unshift({
    id,
    ...input,
    subtasks: [],
    comments: [],
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function updateTask(id: string, input: TaskInput, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.updateTaskFor(ctx, id, input);
  const task = store().tasks.find((t) => t.id === id);
  if (task) Object.assign(task, input);
}

export async function setTaskStatus(id: string, status: TaskStatus, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.setTaskStatusFor(ctx, id, status);
  const task = store().tasks.find((t) => t.id === id);
  if (task) task.status = status;
}

export async function addSubtask(id: string, title: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.addSubtaskFor(ctx, id, title);
  const task = store().tasks.find((t) => t.id === id);
  task?.subtasks.push({ id: newId('s'), title, done: false });
}

export async function toggleSubtask(id: string, subtaskId: string, done: boolean, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.toggleSubtaskFor(ctx, subtaskId, done);
  const sub = store()
    .tasks.find((t) => t.id === id)
    ?.subtasks.find((s) => s.id === subtaskId);
  if (sub) sub.done = done;
}

/** Adds a comment; returns who was mentioned (they get the "mentioned" notification). */
export async function addComment(id: string, text: string, slug?: string): Promise<string[]> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.addCommentFor(ctx, id, text);
  const task = store().tasks.find((t) => t.id === id);
  if (!task) return [];
  task.comments.push({
    id: newId('c'),
    who: EXAMPLE_USER.name,
    text,
    at: new Date().toISOString(),
  });
  const named = mentions(
    text,
    store().members.map((m) => m.name),
  );
  // Each person sees their own list; in example mode that's Kiran's, so only a mention of
  // Kiran by someone else would land there. The others get theirs once members sign in.
  if (named.includes(EXAMPLE_USER.name) && task.comments.at(-1)?.who !== EXAMPLE_USER.name)
    notify('task_mentioned', `You were mentioned in ${task.title}`, text, `/tasks/${task.id}`);
  return named.filter((n) => n !== EXAMPLE_USER.name);
}
