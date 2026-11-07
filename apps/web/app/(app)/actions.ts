'use server';

import { withUser, myWorkspaces } from '@agency-os/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireDb, requireSession, WORKSPACE_COOKIE } from '../../lib/server/session';

/** Switches the active workspace, only to one the user belongs to. */
export async function switchWorkspace(form: FormData) {
  const session = await requireSession();
  const id = String(form.get('workspaceId') ?? '');
  const all = await withUser(requireDb(), session, (tx) => myWorkspaces(tx));
  if (all.some((w) => w.id === id)) {
    (await cookies()).set(WORKSPACE_COOKIE, id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect('/home');
}
