// Server only. Route handlers don't pass through the workspace layout, so downloads check
// membership themselves, with the same rule: not a member and no such workspace look alike.
import { myWorkspaces, withUser } from '@agency-os/db';
import { EXAMPLE_SLUG, exampleMode } from '../data';
import { currentUser } from '../supabase/server';
import { database } from './db';

export async function canOpenWorkspace(slug: string): Promise<boolean> {
  if (exampleMode()) return slug === EXAMPLE_SLUG;
  const user = await currentUser();
  const db = database();
  if (!user || !db) return false;
  const all = await withUser(db, { userId: user.id, email: user.email }, (tx) => myWorkspaces(tx));
  return all.some((w) => w.slug === slug);
}

export const notFoundResponse = () =>
  new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
