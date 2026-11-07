// Server only.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { withUser, myWorkspaces, type Session, type Tx } from '@agency-os/db';
import { database } from './db';
import { supabaseServer } from '../supabase/server';

export const WORKSPACE_COOKIE = 'aos_workspace';

/** The signed-in user from Supabase (verified with the auth server), or null. */
export async function currentSession(): Promise<Session | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}

export async function requireSession(next = '/'): Promise<Session> {
  const session = await currentSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return session;
}

export function requireDb() {
  const db = database();
  if (!db)
    throw new Error(
      'This page needs DATABASE_URL (docs/04-engineering/environments-and-deploy.md).',
    );
  return db;
}

export type ActiveWorkspace = { id: string; name: string; role: string; plan: string };

/**
 * The signed-in user, their workspaces and the active one (from the cookie, else the first).
 * Sends people with no workspace to setup.
 */
export async function requireWorkspace(next = '/') {
  const session = await requireSession(next);
  const db = requireDb();
  const all = await withUser(db, session, (tx) => myWorkspaces(tx));
  if (all.length === 0) redirect('/setup');
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const active = all.find((w) => w.id === wanted) ?? all[0]!;
  return { session, db, workspaces: all, active: active satisfies ActiveWorkspace };
}

export type { Tx };
