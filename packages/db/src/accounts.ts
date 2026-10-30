import {
  inviteExpiry,
  initialsPrefix,
  slugify,
  workspaceDefaults,
  type Role,
} from '@agency-os/core';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import type { Tx } from './client';
import { auditLog, invitations, memberships, profiles, workspaces } from './schema';
import { checkPlanLimit } from './platform';
import { hashToken, linkToken, newToken } from './tokens';

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
  no_access: 'You don’t have access to this. Ask an owner of the workspace.',
  plan_limit: 'Your plan’s limit is reached. Upgrade in Settings, Billing to add more.',
  stage_fixed: 'Won and Lost are fixed stages. You can rename them but not remove them.',
  stage_not_found: 'That stage isn’t in this workspace. Refresh the page and try again.',
  stage_has_leads: 'Move the leads in this stage to another stage first.',
  lost_reason_required: 'Choose why the lead was lost.',
  lost_note_required: 'Add a short note when the reason is Other.',
  lead_not_found: 'That lead doesn’t exist or was deleted.',
  lead_contact_required: 'Add an email or a phone number.',
  lead_name_required: 'Add the lead’s name or company.',
  enquiry_closed: 'This form isn’t taking enquiries right now. Contact the agency directly.',
  consent_required: 'Tick the box to agree to be contacted.',
  client_name_required: 'Add the client’s name.',
  client_not_found: 'That client doesn’t exist or was deleted.',
  contact_name_required: 'Add the contact’s name.',
  contact_not_found: 'That contact doesn’t exist.',
  gstin_invalid: 'Check the GSTIN.',
  gstin_outside_india: 'A GSTIN is only for clients in India. Clear it or change the country.',
  lead_not_won: 'Move the lead to Won, or get its proposal signed, then convert it to a client.',
  quote_for_required: 'Choose the lead or client this is for.',
  quote_items_required: 'Add at least one item.',
  quote_invalid: 'Check the items.',
  quote_not_found: 'That quote doesn’t exist or was deleted.',
  quote_locked: 'This quote was sent, so it can’t change. Make a new version instead.',
  invoice_prefix_invalid: 'Use letters, numbers and dashes for the prefix, like OSS.',
  payment_terms_invalid: 'Use a whole number of days from 0 to 120.',
  brand_color_invalid: 'Use a hex colour with 6 digits, like #0F766E.',
  invoice_items_required: 'Add at least one line.',
  invoice_invalid: 'Check the lines.',
  invoice_not_found: 'That invoice doesn’t exist or was deleted.',
  invoice_locked:
    'This invoice was issued, so it can’t change. Cancel it and issue a new one if it’s wrong.',
  invoice_number_required: 'Issue the invoice to give it a number.',
  invoice_not_payable:
    'Issue the invoice before recording a payment. Cancelled invoices take none.',
  invoice_has_payments: 'This invoice has payments, so it can’t be cancelled.',
  invoice_no_link: 'Issue the invoice to get its pay link.',
  invoice_link_invalid: 'This link doesn’t work. Ask the agency for a new one.',
  exchange_rate_required: 'Add the exchange rate on the invoice date.',
  payment_currency: 'Record the payment in the invoice’s currency.',
  payment_amount: 'Enter an amount above zero.',
  overpayment: 'This is more than the amount due. Check the amount.',
  payment_locked: 'Payments can’t be changed or deleted once recorded.',
  proposal_not_found: 'That proposal doesn’t exist or was deleted.',
  proposal_locked: 'This proposal was sent, so it can’t change. Make a new version instead.',
  proposal_link_invalid: 'This link doesn’t work. Ask the agency for a new one.',
  proposal_signed: 'This proposal is already signed.',
  proposal_declined: 'This proposal was declined. Ask the agency for a new one.',
  proposal_expired: 'This proposal has expired. Ask the agency for a new one.',
  proposal_changed: 'This proposal changed after it was sent. Ask the agency for a new link.',
  signer_name_required: 'Type your full name to sign.',
  signer_email_invalid: 'Check your email address.',
  signing_code_expired: 'That code has expired. Ask for a new one.',
  signing_code_wrong: 'That code isn’t right. Check the email and try again.',
  signing_code_limit: 'Too many tries. Wait an hour, then ask for a new code.',
  project_name_required: 'Give the project a name.',
  project_not_found: 'That project doesn’t exist or you’re not on it.',
  project_mismatch: 'That person or record isn’t part of this workspace or project.',
  template_not_found: 'That template doesn’t exist.',
  template_invalid: 'Check the template.',
  phase_not_found: 'That phase doesn’t exist or you’re not on the project.',
  phase_done: 'This phase is done, so it can’t be skipped.',
  checklist_item_not_found: 'That checklist item doesn’t exist.',
  gate_not_found: 'That gate doesn’t exist or you can’t act on it.',
  gate_not_open: 'This gate is already waiting or approved.',
  gate_not_waiting: 'This gate isn’t waiting for a decision.',
  gate_comment_required: 'Say what needs to change, so the team can act on it.',
  gate_not_your_decision: 'Someone else approves this gate.',
  gate_decision_locked: 'Gates are approved through the approval request, not edited directly.',
  gate_not_approved: 'The earlier gate needs approval first.',
  task_title_required: 'Give the task a title.',
  task_not_found: 'That task doesn’t exist or you’re not on its project.',
  task_mismatch: 'Pick a phase, parent task and assignee from this project and workspace.',
  comment_required: 'Write a comment first.',
  message_required: 'Write a message first.',
  example_invoice_draft: 'Example invoices can’t be issued. Create your own invoice to send.',
  message_too_long: 'Keep messages under 4,000 characters.',
  comment_not_found: 'That comment doesn’t exist or isn’t yours.',
  question_required: 'Write your question first.',
  question_too_long: 'Keep your question under 2,000 characters.',
  too_many_questions:
    'You’ve sent a lot of questions in the last hour. Wait a little, or contact the agency directly.',
  profile_name_required: 'Add your name. Clients and your team see it.',
  profile_name_too_long: 'Keep your name under 80 characters.',
  profile_phone_too_long: 'Keep the phone number under 20 characters.',
  view_name_required: 'Give the view a name.',
  view_name_too_long: 'Keep view names under 60 characters.',
  too_many_views: 'You can keep up to 20 saved views here. Delete one to save another.',
  daily_update_empty: 'Add what you did, what’s next or what’s blocking you.',
  portal_email_required: 'Add an email for this contact. The portal sign-in link goes to it.',
  portal_user_locked:
    'A portal login is linked when the contact signs in. It can’t be set by hand.',
};

export class AccountError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? ACCOUNT_ERRORS[code] ?? code);
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

/** Runs a query and turns the errors our SQL raises into AppErrors with their messages. */
export async function call<T>(fn: () => Promise<T>): Promise<T> {
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

/** The scope of invite links made from LINK_SIGNING_SECRET. */
const INVITE_SCOPE = 'invite';

/** An invite link's token, worked out again from the secret (for the invitation email). */
export function inviteLinkToken(secret: string, invitationId: string) {
  return linkToken(secret, INVITE_SCOPE, invitationId, 1);
}

/**
 * Creates an invitation and returns the token for the link (only its hash is stored). With the
 * link secret the token is made from it, so the email job can rebuild the link; without it the
 * token is random and the link shows only once.
 */
export async function inviteMember(
  tx: Tx,
  input: NewInvitation,
  { secret }: { secret?: string | null } = {},
) {
  if (!input.email && !input.phone)
    throw new Error('An invitation needs an email or a phone number');
  if (input.role === 'owner')
    throw new Error('Owners are made from the members list, not by invitation');
  const limit = await checkPlanLimit(tx, input.workspaceId, 'members');
  if (!limit.allowed) throw new AccountError('plan_limit', limit.message);
  const id = uuidv7();
  const { token, hash } = secret
    ? (() => {
        const t = inviteLinkToken(secret, id);
        return { token: t, hash: hashToken(t) };
      })()
    : newToken();
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
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .leftJoin(profiles, eq(profiles.id, memberships.userId))
    .where(eq(memberships.workspaceId, workspaceId))
    .orderBy(asc(memberships.createdAt));
}

/** Members' sign-in emails, by user id (only for roles that can see members). */
export async function memberEmails(tx: Tx, workspaceId: string): Promise<Map<string, string>> {
  const rows = await tx.execute<{ user_id: string; email: string | null }>(
    sql`select * from workspace_member_emails(${workspaceId}::uuid)`,
  );
  return new Map(rows.flatMap((r) => (r.email ? [[r.user_id, r.email] as const] : [])));
}

/** Invitations not yet accepted or cancelled, newest first (expired ones included). */
export async function listInvitations(tx: Tx, workspaceId: string) {
  return tx
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.workspaceId, workspaceId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    )
    .orderBy(desc(invitations.createdAt));
}

/** Sends an invite again: the old link stops working and a new one works for 7 days. */
export async function resendInvitation(
  tx: Tx,
  invitationId: string,
  actorId: string,
  opts: { secret?: string | null } = {},
) {
  const [old] = await tx
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    );
  if (!old) throw new AccountError('invite_not_found');
  await revokeInvitation(tx, old.id);
  const { id, token } = await inviteMember(
    tx,
    {
      workspaceId: old.workspaceId,
      email: old.email ?? undefined,
      phone: old.phone ?? undefined,
      role: old.role,
      invitedBy: actorId,
    },
    opts,
  );
  return { id, token, email: old.email ?? old.phone ?? '' };
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

export type WorkspaceSetup = {
  services: string[];
  gstin: string | null;
  stateCode: string | null;
  lutArn: string | null;
};

/** Saves the optional answers from workspace setup and returns the workspace's slug. */
export async function saveWorkspaceSetup(tx: Tx, workspaceId: string, setup: WorkspaceSetup) {
  const [row] = await tx
    .update(workspaces)
    .set(setup)
    .where(eq(workspaces.id, workspaceId))
    .returning({ slug: workspaces.slug });
  return row!.slug;
}

/**
 * What the invitation email says: who invited them, where, as what. Null once it can't be used
 * (accepted, cancelled or expired). Service role only.
 */
export async function invitationEmailFacts(tx: Tx, invitationId: string, now = new Date()) {
  const [i] = await tx.select().from(invitations).where(eq(invitations.id, invitationId));
  if (!i || i.acceptedAt || i.revokedAt || i.expiresAt <= now) return null;
  const [w] = await tx
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, i.workspaceId));
  const [by] = i.invitedBy
    ? await tx
        .select({ name: profiles.fullName })
        .from(profiles)
        .where(eq(profiles.id, i.invitedBy))
    : [];
  return {
    id: i.id,
    tokenHash: i.tokenHash,
    role: i.role,
    expiresAt: i.expiresAt,
    workspace: w?.name ?? '',
    invitedBy: by?.name ?? null,
  };
}

// ---- Your own profile ----

export type MyProfile = { fullName: string | null; phone: string | null };

/** The signed-in person's own name and phone (RLS: only their own row is written). */
export async function myProfile(tx: Tx, userId: string): Promise<MyProfile> {
  const [p] = await tx
    .select({ fullName: profiles.fullName, phone: profiles.phone })
    .from(profiles)
    .where(eq(profiles.id, userId));
  return p ?? { fullName: null, phone: null };
}

/** Changes your name (shown to your team and clients) and phone. */
export async function updateMyProfile(tx: Tx, userId: string, input: MyProfile) {
  const fullName = input.fullName?.trim().replace(/\s+/g, ' ') ?? '';
  if (fullName.length < 2) throw new AccountError('profile_name_required');
  if (fullName.length > 80) throw new AccountError('profile_name_too_long');
  const phone = input.phone?.trim() || null;
  if (phone && phone.length > 20) throw new AccountError('profile_phone_too_long');
  await tx
    .insert(profiles)
    .values({ id: userId, fullName, phone })
    .onConflictDoUpdate({ target: profiles.id, set: { fullName, phone } });
}
