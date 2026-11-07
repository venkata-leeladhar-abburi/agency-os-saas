'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountError } from '@agency-os/db';
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

async function checked(slug: string, form: FormData) {
  const f = fields(form);
  const ids = (await projectOptions(slug)).map((p) => p.id);
  return { f, result: checkTask(f, ids, await people(slug)) };
}

/** The words for an error the database raised; anything else is a real failure. */
function shown(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  throw error;
}

export async function createTaskAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { f, result } = await checked(slug, form);
  if (!result.ok) return { errors: result.errors, values: f };
  let id: string;
  try {
    id = await createTask(result.value, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`/w/${slug}/tasks/${id}`);
}

export async function updateTaskAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { f, result } = await checked(slug, form);
  if (!result.ok) return { errors: result.errors, values: f };
  try {
    await updateTask(id, result.value, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}

export async function setStatusAction(slug: string, id: string, form: FormData) {
  const status = String(form.get('status') ?? '');
  const found = TASK_STATUSES.find((s) => s.id === status);
  if (found) await setTaskStatus(id, found.id, slug);
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
  try {
    await addSubtask(id, title, slug);
  } catch (error) {
    return { message: shown(error), values: { title } };
  }
  revalidatePath(`/w/${slug}/tasks/${id}`);
  return { done: Date.now() };
}

export async function toggleSubtaskAction(
  slug: string,
  id: string,
  subtaskId: string,
  done: boolean,
) {
  await toggleSubtask(id, subtaskId, done, slug);
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
  let mentioned: string[];
  try {
    mentioned = await addComment(id, result.value.text, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  revalidatePath(`/w/${slug}/tasks/${id}`);
  return { done: Date.now(), mentioned };
}
