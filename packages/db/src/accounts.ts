import {
  inviteExpiry,
  initialsPrefix,
  slugify,
  workspaceDefaults,
  type Role,
} from '@agency-os/core';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import type { Tx } from './client';
import { auditLog, invitations, memberships, profiles, workspaces } from './schema';
import { hashToken, newToken } from './tokens';

/** Errors the account functions raise, with the words the app shows. */
export const ACCOUNT_ERRORS: Record<string, string> = {
  not_signed_in: 'Sign in to continue.',
  name_required: 'Give your workspace a name.',
  invite_not_found: 'This invite link doesn’t work. Ask for a new one.',
  invite_expired: 'This invite has expired. Invites work for 7 days; ask for a new one.',
  invite_revoked: 'This invite was cancelled. Ask for a new one.',
  invite_used: 'This invite has already been used.',
  invite_wrong_email: 'This invite was sent to a different email. Sign in with that email.',
  already_member: 'You’re already in this workspace.',
  last_owner: 'A workspace needs at least one owner. Make someone else an owner first.',
  slug_taken: 'That workspace address is taken. Try another name.',
};

export class AccountError extends Error {
  constructor(public code: string) {
    super(ACCOUNT_ERRORS[code] ?? code);
  }
}

/** Turns a Postgres exception raised by our SQL functions into an AccountError. */
export function toAccountError(error: unknown): unknown {
  // Drizzle wraps the driver's error; the Postgres code and message are on `cause`.
  const pg = ((error as { cause?: unknown })?.cause ?? error) as {
    message?: string;
    code?: string;
  };
  const message = pg?.message ?? '';
  const code = pg?.code;
  if (code === '23505' && message.includes('workspaces_slug_key'))
    return new AccountError('slug_taken');
  const known = Object.keys(ACCOUNT_ERRORS).find((k) => message === k || message.endsWith(` ${k}`));
  return known ? new AccountError(known) : error;
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toAccountError(error);
  }
}

export type NewWorkspace = { name: string; country?: string; slug?: string };

/** Creates a workspace with the country's defaults and makes the caller its owner. */
export async function createWorkspace(tx: Tx, input: NewWorkspace) {
  const country = (input.country ?? 'IN').toUpperCase();
  const d = workspaceDefaults(country);
  const id = uuidv7();
  const slug = input.slug ?? slugify(input.name);
  await call(() =>
    tx.execute(
      sql`select create_workspace(${id}::uuid, ${input.name}, ${slug}, ${country}, ${d.currency}, ${d.locale}, ${d.timeZone}, ${initialsPrefix(input.name)})`,
    ),
  );
  return id;
}

export async function myWorkspaces(tx: Tx) {
  return tx
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: memberships.role,
      plan: workspaces.plan,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .where(
      and(
        eq(memberships.userId, sql`auth.uid()`),
        eq(memberships.status, 'active'),
        isNull(workspaces.deletedAt),
      ),
    )
    .orderBy(asc(workspaces.name));
}

export type NewInvitation = {
  workspaceId: string;
  email?: string;
  phone?: string;
  role: Role;
  invitedBy: string;
};

/** Creates an invitation and returns the token for the link (only its hash is stored). */
export async function inviteMember(tx: Tx, input: NewInvitation) {
  if (!input.email && !input.phone)
    throw new Error('An invitation needs an email or a phone number');
  if (input.role === 'owner')
    throw new Error('Owners are made from the members list, not by invitation');
  const { token, hash } = newToken();
  const id = uuidv7();
  await tx.insert(invitations).values({
    id,
    workspaceId: input.workspaceId,
    email: input.email?.trim().toLowerCase(),
    phone: input.phone,
    role: input.role,
    tokenHash: hash,
    invitedBy: input.invitedBy,
    expiresAt: inviteExpiry(),
  });
  await tx.insert(auditLog).values({
    workspaceId: input.workspaceId,
    actorId: input.invitedBy,
    action: 'invitation.created',
    subjectType: 'invitation',
    subjectId: id,
    changes: { role: input.role, email: input.email ?? null },
  });
  return { id, token };
}

export async function acceptInvitation(tx: Tx, token: string): Promise<string> {
  const result = await call(() =>
    tx.execute<{ accept_invitation: string }>(sql`select accept_invitation(${hashToken(token)})`),
  );
  return result[0]!.accept_invitation;
}

export async function revokeInvitation(tx: Tx, invitationId: string) {
  const rows = await tx
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(and(eq(invitations.id, invitationId), isNull(invitations.acceptedAt)))
    .returning({ id: invitations.id });
  return rows.length === 1;
}

export async function listMembers(tx: Tx, workspaceId: string) {
  return tx
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      status: memberships.status,
      name: profiles.fullName,
    })
    .from(memberships)
    .leftJoin(profiles, eq(profiles.id, memberships.userId))
    .where(eq(memberships.workspaceId, workspaceId))
    .orderBy(asc(memberships.createdAt));
}

export async function changeRole(tx: Tx, membershipId: string, role: Role) {
  return call(() =>
    tx
      .update(memberships)
      .set({ role })
      .where(eq(memberships.id, membershipId))
      .returning({ id: memberships.id }),
  );
}

export async function removeMember(tx: Tx, membershipId: string) {
  return call(() =>
    tx
      .delete(memberships)
      .where(eq(memberships.id, membershipId))
      .returning({ id: memberships.id }),
  );
}
