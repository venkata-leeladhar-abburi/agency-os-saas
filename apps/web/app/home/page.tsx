import { myWorkspaces, withUser } from '@agency-os/db';
import { redirect } from 'next/navigation';
import { database } from '@/lib/server/db';
import { currentUser } from '@/lib/supabase/server';

/** After sign-in: go to the workspace you last used, or set one up. */
export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');
  const db = database();
  if (!db) redirect('/sign-in?error=database');
  const list = await withUser(db, { userId: user.id, email: user.email }, (tx) => myWorkspaces(tx));
  redirect(list[0] ? `/w/${list[0].slug}` : '/setup');
}
