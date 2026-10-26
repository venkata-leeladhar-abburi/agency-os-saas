'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { clientOptions, createProject, PEOPLE, requestGate } from '@/lib/data';
import { checkProject, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export async function createProjectAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const ids = (await clientOptions()).map((c) => c.id);
  const checked = checkProject(f, ids, PEOPLE);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const id = await createProject(checked.value);
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
  await requestGate(id, title);
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}
