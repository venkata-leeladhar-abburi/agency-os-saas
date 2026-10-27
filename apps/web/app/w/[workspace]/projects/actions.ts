'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountError } from '@agency-os/db';
import { clientOptions, createProject, EXAMPLE_USER, people, requestGate } from '@/lib/data';
import { sendMessage } from '@/lib/data/portal';
import { checkProject, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

/** The words for an error the database raised; anything else is a real failure. */
function shown(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  throw error;
}

export async function createProjectAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const ids = (await clientOptions(slug)).map((c) => c.id);
  const checked = checkProject(f, ids, await people(slug));
  if (!checked.ok) return { errors: checked.errors, values: f };
  let id: string;
  try {
    id = await createProject(checked.value, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`/w/${slug}/projects/${id}`);
}

export async function requestGateAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const title = String(form.get('title') ?? '').trim();
  if (!title)
    return { errors: { title: 'Say what the client is approving, like “Homepage design”.' } };
  try {
    await requestGate(id, title, slug);
  } catch (error) {
    return { message: shown(error), values: { title } };
  }
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}

export async function teamMessageAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const text = String(form.get('text') ?? '');
  const result = await sendMessage(id, { member: EXAMPLE_USER.name }, text);
  if (!result.ok) return { errors: { text: result.error }, values: { text } };
  revalidatePath(`/w/${slug}/projects/${id}`);
  return { done: Date.now() };
}
