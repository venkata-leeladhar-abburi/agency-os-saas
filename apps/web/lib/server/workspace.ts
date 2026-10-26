// Server only.
import { myWorkspaces, withUser, type Session } from '@agency-os/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { database } from './db';

export const WORKSPACE_COOKIE = 'workspace';

export type WorkspaceSummary = Awaited<ReturnType<typeof myWorkspaces>>[number];

/** The workspaces the user belongs to and the one they're working in (the cookie, else the first). */
export async function loadWorkspaces(session: Session) {
  const db = database();
  if (!db) return { db: undefined, workspaces: [] as WorkspaceSummary[], current: undefined };
  const workspaces = await withUser(db, session, (tx) => myWorkspaces(tx));
  const chosen = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const current = workspaces.find((w) => w.id === chosen) ?? workspaces[0];
  return { db, workspaces, current };
}

/** Pages inside the app: the user must have a workspace, or they go to set one up. */
export async function requireWorkspace(session: Session) {
  const ctx = await loadWorkspaces(session);
  if (ctx.db && !ctx.current) redirect('/setup');
  return ctx;
}
