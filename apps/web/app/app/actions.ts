'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireSession } from '../../lib/server/session';
import { loadWorkspaces, WORKSPACE_COOKIE } from '../../lib/server/workspace';

/** Switches to another of the user's workspaces. Only ids from their own memberships are accepted. */
export async function switchWorkspace(formData: FormData) {
  const session = await requireSession('/app');
  const id = String(formData.get('workspace') ?? '');
  const { workspaces } = await loadWorkspaces(session);
  if (workspaces.some((w) => w.id === id))
    (await cookies()).set(WORKSPACE_COOKIE, id, { path: '/', sameSite: 'lax', httpOnly: true });
  redirect('/app');
}
