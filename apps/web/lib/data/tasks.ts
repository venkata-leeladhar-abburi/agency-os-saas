// Server only. Tasks: the board, my tasks, task detail, subtasks and comments.
import type { TaskInput } from '../forms';
import { EXAMPLE_USER, newId, store } from './shared';
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskStatus } from './types';
import { mentions, taskDue } from './views';
import { MEMBERS } from '@agency-os/ui/example';

export type TaskRow = {
  id: string;
  title: string;
  project: string;
  projectId: string;
  assignee: string;
  due: string;
  overdue: boolean;
  priority: 'Low' | 'Normal' | 'High';
  status: 'To do' | 'In progress' | 'In review' | 'Done';
  subtasks: string | null;
  comments: number;
};

function row(t: Task, now: Date): TaskRow {
  const project = store().projects.find((p) => p.id === t.projectId);
  const client = store().clients.find((c) => c.id === project?.clientId);
  const due = taskDue(t.dueOn, t.status === 'done', now);
  const done = t.subtasks.filter((s) => s.done).length;
  return {
    id: t.id,
    title: t.title,
    project: [client?.name, t.phase].filter(Boolean).join(' · '),
    projectId: t.projectId,
    assignee: t.assignee,
    due: due.text,
    overdue: due.overdue,
    priority: TASK_PRIORITIES.find((p) => p.id === t.priority)!.name as TaskRow['priority'],
    status: TASK_STATUSES.find((s) => s.id === t.status)!.name as TaskRow['status'],
    subtasks: t.subtasks.length ? `${done}/${t.subtasks.length}` : null,
    comments: t.comments.length,
  };
}

export async function tasks(filter: { projectId?: string; assignee?: string } = {}) {
  const now = new Date();
  return store()
    .tasks.filter(
      (t) =>
        (!filter.projectId || t.projectId === filter.projectId) &&
        (!filter.assignee || t.assignee === filter.assignee),
    )
    .map((t) => row(t, now));
}

export async function getTask(id: string) {
  const task = store().tasks.find((t) => t.id === id);
  if (!task) return null;
  const project = store().projects.find((p) => p.id === task.projectId)!;
  const client = store().clients.find((c) => c.id === project.clientId)!;
  return { task, project, client, due: taskDue(task.dueOn, task.status === 'done') };
}

export async function projectOptions() {
  return store().projects.map((p) => {
    const client = store().clients.find((c) => c.id === p.clientId);
    return { id: p.id, name: `${client?.name ?? ''} · ${p.name}`, template: p.template };
  });
}

export async function createTask(input: TaskInput): Promise<string> {
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

export async function updateTask(id: string, input: TaskInput) {
  const task = store().tasks.find((t) => t.id === id);
  if (task) Object.assign(task, input);
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const task = store().tasks.find((t) => t.id === id);
  if (task) task.status = status;
}

export async function addSubtask(id: string, title: string) {
  const task = store().tasks.find((t) => t.id === id);
  task?.subtasks.push({ id: newId('s'), title, done: false });
}

export async function toggleSubtask(id: string, subtaskId: string, done: boolean) {
  const sub = store()
    .tasks.find((t) => t.id === id)
    ?.subtasks.find((s) => s.id === subtaskId);
  if (sub) sub.done = done;
}

/** Adds a comment; returns who was mentioned (they get the "mentioned" notification). */
export async function addComment(id: string, text: string): Promise<string[]> {
  const task = store().tasks.find((t) => t.id === id);
  if (!task) return [];
  task.comments.push({
    id: newId('c'),
    who: EXAMPLE_USER.name,
    text,
    at: new Date().toISOString(),
  });
  return mentions(
    text,
    MEMBERS.map((m) => m.name),
  ).filter((n) => n !== EXAMPLE_USER.name);
}
