import { can, type Role } from '@agency-os/core';
import { listInvitations, listMembers, withUser } from '@agency-os/db';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '../../../../lib/server/session';
import { MembersView } from './members-view';

export const metadata = { title: 'Members · Agency OS' };

export default async function MembersPage() {
  const { session, db, active } = await requireWorkspace('/settings/members');
  const role = active.role as Role;
  if (!can(role, 'members.read')) redirect('/home');
  const { members, invitations } = await withUser(db, session, async (tx) => ({
    members: await listMembers(tx, active.id),
    invitations: can(role, 'members.write') ? await listInvitations(tx, active.id) : [],
  }));
  return (
    <MembersView
      canManage={can(role, 'members.write')}
      currentUserId={session.userId}
      workspaceName={active.name}
      members={members.map((m) => ({ ...m, name: m.name ?? null }))}
      invitations={invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expired: i.expired,
        expiresOn: i.expiresAt.toISOString(),
      }))}
    />
  );
}
