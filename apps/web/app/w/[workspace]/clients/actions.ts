'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, inviteToPortal } from '@/lib/data';
import { checkClient, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export async function createClientAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkClient(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const id = await createClient(checked.value);
  revalidatePath(`/w/${slug}/clients`);
  redirect(`/w/${slug}/clients/${id}`);
}

export async function inviteToPortalAction(slug: string, id: string) {
  await inviteToPortal(id);
  revalidatePath(`/w/${slug}/clients/${id}`);
}
