'use server';

import { AccountError, createWorkspace, withUser } from '@agency-os/db';
import { SUPPORTED_COUNTRIES } from '@agency-os/core';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { database } from '../../lib/server/db';
import { requireSession } from '../../lib/server/session';
import { WORKSPACE_COOKIE } from '../../lib/server/workspace';

export type SetupState = { error?: string; name?: string; country?: string };

export async function setUpWorkspace(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const session = await requireSession('/setup');
  const name = String(formData.get('name') ?? '').trim();
  const country = String(formData.get('country') ?? 'IN').toUpperCase();
  const echo = { name, country };

  if (!name) return { ...echo, error: 'Give your workspace a name.' };
  if (name.length > 80) return { ...echo, error: 'Keep the name under 80 characters.' };
  if (!(SUPPORTED_COUNTRIES as readonly string[]).includes(country))
    return { ...echo, error: 'Choose your country from the list.' };
  const db = database();
  if (!db)
    return {
      ...echo,
      error: 'The database isn’t connected yet. Ask the owner to add DATABASE_URL.',
    };

  let id: string;
  try {
    id = await withUser(db, session, (tx) => createWorkspace(tx, { name, country }));
  } catch (error) {
    if (error instanceof AccountError) return { ...echo, error: error.message };
    return { ...echo, error: 'We couldn’t create the workspace. Try again in a moment.' };
  }
  (await cookies()).set(WORKSPACE_COOKIE, id, { path: '/', sameSite: 'lax', httpOnly: true });
  redirect('/app');
}
