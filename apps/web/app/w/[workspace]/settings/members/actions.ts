'use server';

import { ROLE_LABELS, ROLES, type Role } from '@agency-os/core';
import { revalidatePath } from 'next/cache';
import { audit } from '@/lib/data/audit';
import { needsUpgrade } from '@/lib/data/plan';
import { changeRole, invite, removeMember, resendInvite, revokeInvite } from '@/lib/data/team';
import { checkInvite, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';
import { callerIp, siteOrigin } from '@/lib/origin';

export type InviteState = FormState & { link?: string; email?: string };

const refresh = (slug: string) => revalidatePath(`/w/${slug}`, 'layout');

export async function inviteAction(
  slug: string,
  _prev: InviteState,
  form: FormData,
): Promise<InviteState> {
  const f = fields(form);
  const checked = checkInvite(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const limit = await needsUpgrade('members');
  if (limit) return { limit, values: f };
  const result = await invite(checked.value.email, checked.value.role);
  if (!result.ok) return { errors: { email: result.error }, values: f };
  audit(
    'member.invited',
    checked.value.email,
    `As ${ROLE_LABELS[checked.value.role]}`,
    await callerIp(),
  );
  refresh(slug);
  return {
    done: Date.now(),
    link: `${await siteOrigin()}/invite/${result.token}`,
    email: checked.value.email,
  };
}

export async function resendAction(slug: string, id: string): Promise<InviteState> {
  const i = await resendInvite(id);
  if (!i) return { message: 'That invite was already used or cancelled.' };
  audit('member.invite_resent', i.email, 'A new link, valid for 7 days', await callerIp());
  refresh(slug);
  return { done: Date.now(), link: `${await siteOrigin()}/invite/${i.token}`, email: i.email };
}

export async function revokeAction(slug: string, id: string) {
  const i = await revokeInvite(id);
  if (i) audit('member.invite_revoked', i.email, '', await callerIp());
  refresh(slug);
}

export async function changeRoleAction(
  slug: string,
  memberId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const role = String(form.get('role') ?? '') as Role;
  if (!ROLES.includes(role)) return { message: 'Pick a role.' };
  const result = await changeRole(memberId, role);
  if (!result.ok) return { message: result.error };
  audit('member.role_changed', result.member!.email, `Now ${ROLE_LABELS[role]}`, await callerIp());
  refresh(slug);
  return { done: Date.now() };
}

export async function removeAction(slug: string, memberId: string): Promise<FormState> {
  const result = await removeMember(memberId);
  if (!result.ok) return { message: result.error };
  audit('member.removed', result.member!.email, result.member!.name, await callerIp());
  refresh(slug);
  return { done: Date.now() };
}
