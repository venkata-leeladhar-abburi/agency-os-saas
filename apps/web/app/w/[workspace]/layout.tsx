import { myWorkspaces, withUser } from '@agency-os/db';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { EXAMPLE_USER, EXAMPLE_WORKSPACE, exampleMode } from '@/lib/data';
import { database } from '@/lib/server/db';
import { currentUser } from '@/lib/supabase/server';
import { WorkspaceShell } from './shell';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  if (exampleMode()) {
    if (workspace !== EXAMPLE_WORKSPACE.slug) redirect(`/w/${EXAMPLE_WORKSPACE.slug}`);
    return (
      <WorkspaceShell
        current={EXAMPLE_WORKSPACE}
        all={[EXAMPLE_WORKSPACE]}
        user={EXAMPLE_USER.name}
        example
      >
        {children}
      </WorkspaceShell>
    );
  }
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=/w/${workspace}`);
  const db = database();
  if (!db) throw new Error('DATABASE_URL is not set');
  const all = await withUser(db, { userId: user.id, email: user.email }, (tx) => myWorkspaces(tx));
  const current = all.find((w) => w.slug === workspace);
  // Not a member (or it doesn't exist): same answer, so slugs can't be probed.
  if (!current) notFound();
  return (
    <WorkspaceShell current={current} all={all} user={user.email ?? 'You'}>
      {children}
    </WorkspaceShell>
  );
}
