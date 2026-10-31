'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountError } from '@agency-os/db';
import { createClient, exampleMode, getClient, inviteToPortal, planLimit } from '@/lib/data';
import { audit } from '@/lib/data/audit';
import { callerIp } from '@/lib/origin';
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
  let id: string;
  try {
    id = await createClient(checked.value, slug);
  } catch (error) {
    if (error instanceof AccountError) return { message: error.message, values: f };
    throw error;
  }
  revalidatePath(`/w/${slug}/clients`);
  redirect(`/w/${slug}/clients/${id}`);
}

export async function inviteToPortalAction(slug: string, id: string): Promise<FormState> {
  const limit = await planLimit(slug, 'portal_clients');
  if (limit) return { limit };
  try {
    await inviteToPortal(id, slug);
  } catch (error) {
    if (error instanceof AccountError) return { message: error.message };
    throw error;
  }
  // The database records the invite on the client's timeline itself.
  if (exampleMode()) {
    const found = await getClient(id);
    if (found)
      audit('client.portal_invited', found.client.name, found.client.email ?? '', await callerIp());
  }
  revalidatePath(`/w/${slug}/clients/${id}`);
  return { done: Date.now() };
}
