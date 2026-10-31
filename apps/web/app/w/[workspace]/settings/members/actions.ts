'use server';

import { ROLE_LABELS, ROLES, type Role } from '@agency-os/core';
import { revalidatePath } from 'next/cache';
import { exampleMode, planLimit } from '@/lib/data';
import { audit, recordAudit } from '@/lib/data/audit';
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
  const limit = await planLimit(slug, 'members');
  if (limit) return { limit, values: f };
  const result = await invite(checked.value.email, checked.value.role, slug);
  if (!result.ok) return { errors: { email: result.error }, values: f };
  // The database records the invitation in the audit log itself.
  if (exampleMode())
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
  const i = await resendInvite(id, slug);
  if (!i) return { message: 'That invite was already used or cancelled.' };
  await recordAudit(
    slug,
    'member.invite_resent',
    i.email,
    'A new link, valid for 7 days',
    await callerIp(),
  );
  refresh(slug);
  return { done: Date.now(), link: `${await siteOrigin()}/invite/${i.token}`, email: i.email };
}

export async function revokeAction(slug: string, id: string) {
  const i = await revokeInvite(id, slug);
  if (i) await recordAudit(slug, 'member.invite_revoked', i.email, '', await callerIp());
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
  const result = await changeRole(memberId, role, slug);
  if (!result.ok) return { message: result.error };
  await recordAudit(
    slug,
    'member.role_changed',
    result.member!.email,
    `Now ${ROLE_LABELS[role]}`,
    await callerIp(),
  );
  refresh(slug);
  return { done: Date.now() };
}

export async function removeAction(slug: string, memberId: string): Promise<FormState> {
  const result = await removeMember(memberId, slug);
  if (!result.ok) return { message: result.error };
  await recordAudit(
    slug,
    'member.removed',
    result.member!.email,
    result.member!.name,
    await callerIp(),
  );
  refresh(slug);
  return { done: Date.now() };
}
