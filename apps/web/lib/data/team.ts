// Server only. The team: members, roles, invitations and daily updates.
import { randomBytes } from 'node:crypto';
import { inviteExpiry, ROLE_LABELS, type Role } from '@agency-os/core';
import { EXAMPLE_USER, newId, store } from './shared';
import type { Invitation, Member } from './types';
import { dueIn, istDate, relativeInSentence } from './views';

export async function people(): Promise<string[]> {
  return store().members.map((m) => m.name);
}

export type InviteRow = Invitation & {
  state: 'pending' | 'expired';
  sent: string;
  expires: string;
};

export async function team(now = new Date()) {
  const s = store();
  const members = s.members.map((m) => ({
    ...m,
    roleLabel: ROLE_LABELS[m.role],
    projects: s.projects.filter(
      (p) =>
        p.lead === m.name || s.tasks.some((t) => t.projectId === p.id && t.assignee === m.name),
    ).length,
    openTasks: s.tasks.filter((t) => t.assignee === m.name && t.status !== 'done').length,
    you: m.name === EXAMPLE_USER.name,
  }));
  const invites: InviteRow[] = s.invitations
    .filter((i) => !i.revokedAt && !i.acceptedAt)
    .map((i) => ({
      ...i,
      state: new Date(i.expiresAt) > now ? 'pending' : 'expired',
      sent: relativeInSentence(i.createdAt, now),
      expires: dueIn(i.expiresAt, now),
    }));
  return { members, invites };
}

type Outcome = { ok: true } | { ok: false; error: string };

export async function invite(email: string, role: Role): Promise<Outcome & { token?: string }> {
  const s = store();
  const address = email.trim().toLowerCase();
  if (role === 'owner')
    return { ok: false, error: 'Make someone an owner from the members list once they’ve joined.' };
  if (s.members.some((m) => m.email === address))
    return { ok: false, error: 'They’re already a member of this workspace.' };
  const open = s.invitations.find(
    (i) =>
      i.email === address && !i.revokedAt && !i.acceptedAt && new Date(i.expiresAt) > new Date(),
  );
  if (open)
    return {
      ok: false,
      error: 'They already have an invite waiting. Send it again from the list.',
    };
  const token = randomBytes(16).toString('base64url');
  s.invitations.unshift({
    id: newId('inv'),
    email: address,
    role,
    token,
    invitedBy: EXAMPLE_USER.name,
    createdAt: new Date().toISOString(),
    expiresAt: inviteExpiry().toISOString(),
    revokedAt: null,
    acceptedAt: null,
  });
  return { ok: true, token };
}

/** A fresh link and another 7 days; the old link stops working. */
export async function resendInvite(id: string): Promise<Invitation | null> {
  const i = store().invitations.find((x) => x.id === id && !x.revokedAt && !x.acceptedAt);
  if (!i) return null;
  i.token = randomBytes(16).toString('base64url');
  i.createdAt = new Date().toISOString();
  i.expiresAt = inviteExpiry().toISOString();
  return i;
}

export async function revokeInvite(id: string): Promise<Invitation | null> {
  const i = store().invitations.find((x) => x.id === id && !x.revokedAt && !x.acceptedAt);
  if (i) i.revokedAt = new Date().toISOString();
  return i ?? null;
}

const owners = () => store().members.filter((m) => m.role === 'owner');

export async function changeRole(
  memberId: string,
  role: Role,
): Promise<Outcome & { member?: Member }> {
  const m = store().members.find((x) => x.id === memberId);
  if (!m) return { ok: false, error: 'That person isn’t a member any more.' };
  if (m.role === 'owner' && role !== 'owner' && owners().length === 1)
    return {
      ok: false,
      error: 'A workspace needs at least one owner. Make someone else an owner first.',
    };
  m.role = role;
  return { ok: true, member: m };
}

export async function removeMember(memberId: string): Promise<Outcome & { member?: Member }> {
  const s = store();
  const m = s.members.find((x) => x.id === memberId);
  if (!m) return { ok: false, error: 'That person isn’t a member any more.' };
  if (m.role === 'owner' && owners().length === 1)
    return {
      ok: false,
      error: 'A workspace needs at least one owner. Make someone else an owner first.',
    };
  if (m.name === EXAMPLE_USER.name)
    return { ok: false, error: 'You can’t remove yourself. Ask another owner.' };
  s.members = s.members.filter((x) => x.id !== memberId);
  return { ok: true, member: m };
}

export async function invitationByToken(token: string) {
  const i = store().invitations.find((x) => x.token === token);
  if (!i) return { state: 'invalid' as const };
  if (i.revokedAt) return { state: 'revoked' as const, invite: i };
  if (i.acceptedAt) return { state: 'used' as const, invite: i };
  if (new Date(i.expiresAt) <= new Date()) return { state: 'expired' as const, invite: i };
  return { state: 'open' as const, invite: i, workspace: store().settings.name };
}

/** Example mode: the invited person accepts and joins with the invite's role. */
export async function acceptInvite(token: string, name: string): Promise<Outcome> {
  const found = await invitationByToken(token);
  if (found.state !== 'open') return { ok: false, error: 'This invite can’t be used any more.' };
  const i = found.invite;
  i.acceptedAt = new Date().toISOString();
  store().members.push({
    id: newId('u'),
    name: name.trim(),
    email: i.email,
    role: i.role,
    title: ROLE_LABELS[i.role],
    joinedAt: i.acceptedAt,
  });
  return { ok: true };
}

export async function dailyUpdates(on = istDate(new Date())) {
  const s = store();
  const posted = s.dailyUpdates.filter((d) => d.on === on);
  return {
    posted,
    waiting: s.members.map((m) => m.name).filter((n) => !posted.some((d) => d.member === n)),
    mine: posted.find((d) => d.member === EXAMPLE_USER.name) ?? null,
  };
}

/** One update per person a day; posting again replaces it. */
export async function postDailyUpdate(input: { done: string; next: string; blockers: string }) {
  const s = store();
  const on = istDate(new Date());
  s.dailyUpdates = s.dailyUpdates.filter((d) => !(d.on === on && d.member === EXAMPLE_USER.name));
  s.dailyUpdates.push({
    id: newId('d'),
    member: EXAMPLE_USER.name,
    on,
    ...input,
    at: new Date().toISOString(),
  });
}
