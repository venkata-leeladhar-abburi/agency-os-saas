'use server';

import {
  AccountError,
  changeRole,
  inviteMember,
  removeMember,
  revokeInvitation,
  withUser,
} from '@agency-os/db';
import { ROLES, type Role } from '@agency-os/core';
import { revalidatePath } from 'next/cache';
import { appUrl } from '../../../../lib/supabase/env';
import { requireWorkspace } from '../../../../lib/server/session';

export type MemberState = { error?: string; link?: string; email?: string; ok?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_ROLES = ROLES.filter((r): r is Exclude<Role, 'owner'> => r !== 'owner');

function fail(error: unknown): MemberState {
  if (error instanceof AccountError) return { error: error.message };
  return { error: 'That didn’t save. Check your connection and try again.' };
}

/** Creates an invite and returns its link. The link is shown to copy; email sending arrives with Resend. */
export async function invite(_: MemberState, form: FormData): Promise<MemberState> {
  const { session, db, active } = await requireWorkspace('/settings/members');
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const role = String(form.get('role') ?? 'member') as Role;
  if (!EMAIL.test(email))
    return { error: 'Check the email address. It should look like name@agency.in.' };
  if (role === 'owner' || !INVITE_ROLES.includes(role))
    return { error: 'Choose a role for this person.' };
  try {
    const { token } = await withUser(db, session, (tx) =>
      inviteMember(tx, { workspaceId: active.id, email, role, invitedBy: session.userId }),
    );
    revalidatePath('/settings/members');
    return { link: `${appUrl()}/invite/${token}`, email };
  } catch (error) {
    return fail(error);
  }
}

/** Cancels an open invite and, when asked, issues a fresh link (the old token can't be shown again). */
export async function resend(_: MemberState, form: FormData): Promise<MemberState> {
  const { session, db, active } = await requireWorkspace('/settings/members');
  const id = String(form.get('invitationId') ?? '');
  const email = String(form.get('email') ?? '');
  const role = String(form.get('role') ?? 'member') as Role;
  try {
    const result = await withUser(db, session, async (tx) => {
      await revokeInvitation(tx, id);
      return inviteMember(tx, { workspaceId: active.id, email, role, invitedBy: session.userId });
    });
    revalidatePath('/settings/members');
    return { link: `${appUrl()}/invite/${result.token}`, email };
  } catch (error) {
    return fail(error);
  }
}

export async function revoke(_: MemberState, form: FormData): Promise<MemberState> {
  const { session, db } = await requireWorkspace('/settings/members');
  try {
    await withUser(db, session, (tx) =>
      revokeInvitation(tx, String(form.get('invitationId') ?? '')),
    );
    revalidatePath('/settings/members');
    return { ok: 'Invite cancelled.' };
  } catch (error) {
    return fail(error);
  }
}

export async function setRole(_: MemberState, form: FormData): Promise<MemberState> {
  const { session, db } = await requireWorkspace('/settings/members');
  const role = String(form.get('role') ?? '') as Role;
  if (!ROLES.includes(role)) return { error: 'Choose a role from the list.' };
  try {
    await withUser(db, session, (tx) =>
      changeRole(tx, String(form.get('membershipId') ?? ''), role),
    );
    revalidatePath('/settings/members');
    return { ok: 'Role updated.' };
  } catch (error) {
    return fail(error);
  }
}

export async function remove(_: MemberState, form: FormData): Promise<MemberState> {
  const { session, db } = await requireWorkspace('/settings/members');
  try {
    await withUser(db, session, (tx) => removeMember(tx, String(form.get('membershipId') ?? '')));
    revalidatePath('/settings/members');
    return { ok: 'Member removed.' };
  } catch (error) {
    return fail(error);
  }
}
