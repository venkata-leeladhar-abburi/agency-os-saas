'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { people } from '@/lib/data';
import {
  addComment,
  addSubtask,
  createTask,
  projectOptions,
  setTaskStatus,
  toggleSubtask,
  updateTask,
} from '@/lib/data/tasks';
import { TASK_STATUSES } from '@/lib/data/types';
import { checkComment, checkTask, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

async function checked(form: FormData) {
  const f = fields(form);
  const ids = (await projectOptions()).map((p) => p.id);
  return { f, result: checkTask(f, ids, await people()) };
}

export async function createTaskAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { f, result } = await checked(form);
  if (!result.ok) return { errors: result.errors, values: f };
  const id = await createTask(result.value);
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`/w/${slug}/tasks/${id}`);
}

export async function updateTaskAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { f, result } = await checked(form);
  if (!result.ok) return { errors: result.errors, values: f };
  await updateTask(id, result.value);
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}

export async function setStatusAction(slug: string, id: string, form: FormData) {
  const status = String(form.get('status') ?? '');
  const found = TASK_STATUSES.find((s) => s.id === status);
  if (found) await setTaskStatus(id, found.id);
  revalidatePath(`/w/${slug}`, 'layout');
}

export async function addSubtaskAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const title = String(form.get('title') ?? '').trim();
  if (!title) return { errors: { title: 'Name the subtask first.' } };
  await addSubtask(id, title);
  revalidatePath(`/w/${slug}/tasks/${id}`);
  return { done: Date.now() };
}

export async function toggleSubtaskAction(
  slug: string,
  id: string,
  subtaskId: string,
  done: boolean,
) {
  await toggleSubtask(id, subtaskId, done);
  revalidatePath(`/w/${slug}/tasks/${id}`);
}

export async function addCommentAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState & { mentioned?: string[] }> {
  const f = fields(form);
  const result = checkComment(f);
  if (!result.ok) return { errors: result.errors, values: f };
  const mentioned = await addComment(id, result.value.text);
  revalidatePath(`/w/${slug}/tasks/${id}`);
  return { done: Date.now(), mentioned };
}
