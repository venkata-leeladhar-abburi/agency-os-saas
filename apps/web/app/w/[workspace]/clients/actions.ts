'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, getClient, inviteToPortal } from '@/lib/data';
import { audit } from '@/lib/data/audit';
import { callerIp } from '@/lib/origin';

import { needsUpgrade } from '@/lib/data/plan';
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

export async function inviteToPortalAction(slug: string, id: string): Promise<FormState> {
  const limit = await needsUpgrade('portal_clients');
  if (limit) return { limit };
  await inviteToPortal(id);
  const found = await getClient(id);
  if (found)
    audit('client.portal_invited', found.client.name, found.client.email ?? '', await callerIp());
  revalidatePath(`/w/${slug}/clients/${id}`);
  return { done: Date.now() };
}
