'use server';

import { createWorkspace, saveWorkspaceSetup, withUser } from '@agency-os/db';
import { SUPPORTED_COUNTRIES, validateGstin } from '@agency-os/core';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import { database } from '@/lib/server/db';

export type SetupState = { error?: string; field?: 'name' | 'gstin' };

const SERVICES = [
  'Website',
  'Landing page',
  'Brand identity',
  'UI/UX design',
  'Mobile app',
  'Web app or SaaS',
  'Online store',
  'SEO',
];

export async function setUpWorkspace(_prev: SetupState, form: FormData): Promise<SetupState> {
  const user = await currentUser();
  if (!user) redirect('/sign-in?next=/setup');
  const db = database();
  if (!db) return { error: 'The database isn’t connected. Try again in a minute.' };

  const name = String(form.get('name') ?? '').trim();
  const country = String(form.get('country') ?? 'IN');
  if (name.length < 2)
    return { field: 'name', error: 'Give your workspace a name of at least 2 letters.' };
  if (!SUPPORTED_COUNTRIES.includes(country)) return { error: 'Pick a country from the list.' };

  const services = form
    .getAll('services')
    .map(String)
    .filter((s) => SERVICES.includes(s));
  const skipGst = form.get('skip') === 'gst';
  const registered = form.get('gstRegistered') === 'on' && !skipGst && country === 'IN';
  const rawGstin = String(form.get('gstin') ?? '').trim();
  let gst: { gstin: string; stateCode: string } | undefined;
  if (registered && rawGstin) {
    const result = validateGstin(rawGstin);
    if (!result.ok) return { field: 'gstin', error: result.error };
    gst = result;
  }
  const lutArn = registered ? String(form.get('lutArn') ?? '').trim() || null : null;

  let slug: string;
  try {
    slug = await withUser(db, { userId: user.id, email: user.email }, async (tx) => {
      const id = await createWorkspace(tx, { name, country });
      return saveWorkspaceSetup(tx, id, {
        services,
        gstin: gst?.gstin ?? null,
        stateCode: gst?.stateCode ?? null,
        lutArn,
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return {
      field: 'name',
      error: /address is taken/.test(message)
        ? message
        : 'The workspace wasn’t created. Check your connection and try again.',
    };
  }
  redirect(`/w/${slug}`);
}
