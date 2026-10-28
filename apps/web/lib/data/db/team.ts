// Server only. Team, invitations, daily updates, notifications and the audit log on the
// database, in the shapes the screens use (see ../team.ts, ../notifications.ts and ../audit.ts
// for the example-mode versions). Every query runs as the member, so RLS decides what they see.
import {
  NOTIFICATION_KINDS,
  ROLE_LABELS,
  formatMoney,
  type NotificationKey,
  type Role,
} from '@agency-os/core';
import {
  AccountError,
  addAuditEntry,
  auditCount,
  changeRole as dbChangeRole,
  dailyUpdatesFor,
  inviteMember,
  listAuditLog,
  listInvitations,
  listMembers,
  listNotifications,
  markRead,
  memberEmails,
  notificationSettings,
  queueEmails,
  removeMember as dbRemoveMember,
  resendInvitation,
  revokeInvitation,
  saveDailyUpdate,
  setNotificationPreference,
  teamOverview,
  toAccountError,
  unreadCount,
  withService,
  type Tx,
} from '@agency-os/db';
import { emailsQueued } from '../../server/jobs';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import type {
  AuditEntry,
  DailyUpdate,
  Member,
  NotificationCategory,
  WorkspaceSettings,
} from '../types';
import { dueIn, istDate, relativeInSentence, relativeTime } from '../views';

// ---------- Team and invitations ----------

async function membersOf(tx: Tx, ctx: WorkspaceCtx) {
  const [rows, emails] = await Promise.all([
    listMembers(tx, ctx.workspaceId),
    memberEmails(tx, ctx.workspaceId),
  ]);
  return rows
    .filter((m) => m.status === 'active')
    .map((m): Member & { userId: string } => ({
      id: m.id,
      userId: m.userId,
      name: m.name ?? emails.get(m.userId) ?? 'A member',
      email: emails.get(m.userId) ?? '',
      role: m.role,
      title: ROLE_LABELS[m.role],
      joinedAt: m.joinedAt.toISOString(),
    }));
}

/** The members and open invitations, as the members page and team page show them. */
export async function teamFor(ctx: WorkspaceCtx, now = new Date()) {
  return asMember(ctx, async (tx) => {
    const [members, overview, invites] = await Promise.all([
      membersOf(tx, ctx),
      teamOverview(tx, ctx.workspaceId),
      listInvitations(tx, ctx.workspaceId),
    ]);
    return {
      members: members.map((m) => {
        const o = overview.find((x) => x.user_id === m.userId);
        return {
          ...m,
          roleLabel: ROLE_LABELS[m.role],
          projects: o?.projects ?? 0,
          openTasks: o?.open_tasks ?? 0,
          you: m.userId === ctx.session.userId,
        };
      }),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email ?? i.phone ?? '',
        role: i.role,
        // Only the hash is stored; the link is shown once, when the invite is made or sent again.
        token: '',
        invitedBy: '',
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        revokedAt: null,
        acceptedAt: null,
        state: i.expiresAt > now ? ('pending' as const) : ('expired' as const),
        sent: relativeInSentence(i.createdAt.toISOString(), now),
        expires: dueIn(i.expiresAt.toISOString(), now),
      })),
    };
  });
}

type Outcome = { ok: true } | { ok: false; error: string };

/**
 * Runs a member's change and turns a refusal from the database (last owner, plan limit) into the
 * words the form shows. Caught after the transaction ends: a failed statement aborts it.
 */
async function refusable<T>(run: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await run();
  } catch (error) {
    const known = toAccountError(error);
    if (known instanceof AccountError) return { ok: false, error: known.message };
    throw error;
  }
}

export async function inviteFor(
  ctx: WorkspaceCtx,
  email: string,
  role: Role,
): Promise<Outcome & { token?: string; id?: string }> {
  const address = email.trim().toLowerCase();
  if (role === 'owner')
    return { ok: false, error: 'Make someone an owner from the members list once they’ve joined.' };
  return refusable(() =>
    asMember(ctx, async (tx): Promise<Outcome & { token?: string; id?: string }> => {
      const [members, open] = await Promise.all([
        membersOf(tx, ctx),
        listInvitations(tx, ctx.workspaceId),
      ]);
      if (members.some((m) => m.email === address))
        return { ok: false, error: 'They’re already a member of this workspace.' };
      if (open.some((i) => i.email === address && i.expiresAt > new Date()))
        return {
          ok: false,
          error: 'They already have an invite waiting. Send it again from the list.',
        };
      const { id, token } = await inviteMember(
        tx,
        { workspaceId: ctx.workspaceId, email: address, role, invitedBy: ctx.session.userId },
        { secret: inviteSecret() },
      );
      return { ok: true, token, id };
    }),
  ).then(async (r) => {
    if (r.ok && r.id) await inviteEmail(ctx, r.id, address);
    return r;
  });
}

/** The link secret, when it's set: invite links made from it can be emailed. */
function inviteSecret(): string | null {
  const secret = process.env.LINK_SIGNING_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

/** "[name] invited you to [workspace] on Agency OS": only for links the job can rebuild. */
async function inviteEmail(ctx: WorkspaceCtx, invitationId: string, email: string) {
  if (!inviteSecret()) return;
  await withService(ctx.db, ctx.workspaceId, (tx) =>
    queueEmails(tx, ctx.workspaceId, [
      {
        kind: 'member.invited',
        toEmail: email,
        audience: 'member',
        payload: { invitationId },
        dedupeKey: `member.invited:${invitationId}`,
      },
    ]),
  );
  await emailsQueued(ctx.workspaceId);
}

/** A fresh link and another 7 days; the old link stops working. Null if it can't be sent. */
export async function resendFor(ctx: WorkspaceCtx, id: string) {
  const sent = await refusable(() =>
    asMember(ctx, (tx) => resendInvitation(tx, id, ctx.session.userId, { secret: inviteSecret() })),
  );
  if (!('token' in sent)) return null;
  if (sent.email.includes('@')) await inviteEmail(ctx, sent.id, sent.email);
  return { email: sent.email, token: sent.token };
}

export async function revokeFor(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, async (tx) => {
    const [invite] = (await listInvitations(tx, ctx.workspaceId)).filter((i) => i.id === id);
    if (!invite || !(await revokeInvitation(tx, id))) return null;
    return { email: invite.email ?? invite.phone ?? '' };
  });
}

export async function changeRoleFor(
  ctx: WorkspaceCtx,
  membershipId: string,
  role: Role,
): Promise<Outcome & { member?: Member }> {
  return refusable(() =>
    asMember(ctx, async (tx): Promise<Outcome & { member?: Member }> => {
      const member = (await membersOf(tx, ctx)).find((m) => m.id === membershipId);
      if (!member) return { ok: false, error: 'That person isn’t a member any more.' };
      await dbChangeRole(tx, membershipId, role);
      return { ok: true, member: { ...member, role } };
    }),
  );
}

export async function removeFor(
  ctx: WorkspaceCtx,
  membershipId: string,
): Promise<Outcome & { member?: Member }> {
  return refusable(() =>
    asMember(ctx, async (tx): Promise<Outcome & { member?: Member }> => {
      const member = (await membersOf(tx, ctx)).find((m) => m.id === membershipId);
      if (!member) return { ok: false, error: 'That person isn’t a member any more.' };
      if (member.userId === ctx.session.userId)
        return { ok: false, error: 'You can’t remove yourself. Ask another owner.' };
      await dbRemoveMember(tx, membershipId);
      return { ok: true, member };
    }),
  );
}

// ---------- Daily updates ----------

export async function dailyUpdatesOn(ctx: WorkspaceCtx, on: string) {
  return asMember(ctx, async (tx) => {
    const [members, rows] = await Promise.all([
      membersOf(tx, ctx),
      dailyUpdatesFor(tx, ctx.workspaceId, { forDate: on }),
    ]);
    const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? 'A member';
    const posted: DailyUpdate[] = rows
      .filter((r) => !r.projectId)
      .map((r) => ({
        id: r.id,
        member: nameOf(r.userId),
        on: r.forDate,
        done: r.done ?? '',
        next: r.next ?? '',
        blockers: r.blockers ?? '',
        at: r.updatedAt.toISOString(),
      }));
    const me = nameOf(ctx.session.userId);
    return {
      posted,
      // RLS shows managers everyone's updates and others only their own, so "waiting" is
      // only meaningful to managers; the screen shows it as written.
      waiting: members.map((m) => m.name).filter((n) => !posted.some((d) => d.member === n)),
      mine: posted.find((d) => d.member === me) ?? null,
    };
  });
}

export async function postDailyUpdateFor(
  ctx: WorkspaceCtx,
  input: { done: string; next: string; blockers: string },
  now = new Date(),
) {
  return asMember(ctx, (tx) =>
    saveDailyUpdate(tx, ctx.workspaceId, ctx.session.userId, {
      forDate: istDate(now.toISOString()),
      ...input,
    }),
  );
}

// ---------- Notifications ----------

/** The settings screen's categories and the database's notification kinds. */
const CATEGORY_KIND: Record<NotificationCategory, NotificationKey> = {
  enquiry: 'lead.enquiry',
  proposal_viewed: 'proposal.viewed',
  proposal_decided: 'proposal.decided',
  gate_decided: 'gate.decided',
  task_mentioned: 'task.assigned',
  payment_received: 'payment.received',
  message: 'message.posted',
};

type Payload = Record<string, unknown>;
const str = (v: unknown, fallback = '') => (typeof v === 'string' && v ? v : fallback);

/** A notification's words and link, from its kind and what the database stored with it. */
export function notificationText(
  kind: string,
  p: Payload,
): { title: string; detail: string; href: string } {
  const client = str(p.client, 'The client');
  switch (kind) {
    case 'lead.enquiry':
      return {
        title: `New enquiry from ${str(p.name, 'someone')}`,
        detail: 'From your website form',
        href: `/leads/${str(p.leadId)}`,
      };
    case 'proposal.viewed':
      return {
        title: `${client} viewed your proposal`,
        detail: '',
        href: `/sales/proposals/${str(p.proposalId)}`,
      };
    case 'proposal.decided':
      return {
        title: `${client} ${p.outcome === 'declined' ? 'declined' : 'signed'} the proposal`,
        detail: '',
        href: `/sales/proposals/${str(p.proposalId)}`,
      };
    case 'gate.decided':
      return {
        title:
          p.outcome === 'approved'
            ? `${client} approved ${str(p.gate, 'the sign-off')}`
            : `${client} asked for changes to ${str(p.gate, 'the sign-off')}`,
        detail: str(p.comment),
        href: `/projects/${str(p.projectId)}`,
      };
    case 'message.posted':
      return {
        title: `New message from ${str(p.name, 'the client')} about ${str(p.project, 'a project')}`,
        detail: '',
        href: `/projects/${str(p.projectId)}`,
      };
    case 'gate.requested':
      return {
        title: `Approve ${str(p.gate, 'a sign-off')}`,
        detail: str(p.project),
        href: `/projects/${str(p.projectId)}`,
      };
    case 'task.assigned':
      return {
        title:
          p.reason === 'mentioned'
            ? `You were mentioned in ${str(p.task, 'a task')}`
            : `${str(p.task, 'A task')} was assigned to you`,
        detail: '',
        href: `/tasks/${str(p.taskId)}`,
      };
    case 'invoice.overdue':
      return {
        title: str(p.number) ? `Invoice ${str(p.number)} is overdue` : 'An invoice is overdue',
        detail: [
          str(p.client),
          typeof p.amountMinor === 'string'
            ? `${formatMoney(BigInt(p.amountMinor), str(p.currency, 'INR'))} due`
            : '',
        ]
          .filter(Boolean)
          .join(' · '),
        href: `/invoices/${str(p.invoiceId)}`,
      };
    case 'payment.received':
      return {
        title: `Payment received for ${str(p.number, 'an invoice')}`,
        detail:
          typeof p.amountMinor === 'string'
            ? formatMoney(BigInt(p.amountMinor), str(p.currency, 'INR'))
            : '',
        href: `/invoices/${str(p.invoiceId)}`,
      };
    default:
      return {
        title: NOTIFICATION_KINDS[kind as NotificationKey]?.label ?? 'Something happened',
        detail: '',
        href: '',
      };
  }
}

export async function notificationList(ctx: WorkspaceCtx, slug: string, now = new Date()) {
  return asMember(ctx, async (tx) => {
    const [rows, unread] = await Promise.all([
      listNotifications(tx, ctx.workspaceId),
      unreadCount(tx, ctx.workspaceId),
    ]);
    return {
      rows: rows.map((n) => {
        const t = notificationText(n.kind, (n.payload ?? {}) as Payload);
        return {
          id: n.id,
          title: t.title,
          detail: t.detail,
          href: `/w/${slug}${t.href}`,
          when: relativeTime(n.createdAt.toISOString(), now),
          at: n.createdAt.toISOString(),
          read: n.readAt !== null,
        };
      }),
      unread: Number(unread),
    };
  });
}

export async function markReadFor(ctx: WorkspaceCtx, id?: string) {
  return asMember(ctx, (tx) => markRead(tx, ctx.workspaceId, id ? [id] : undefined));
}

/** The member's own settings for each category: in the app, and email on or off. */
export async function prefsFor(ctx: WorkspaceCtx): Promise<WorkspaceSettings['notificationPrefs']> {
  return asMember(ctx, async (tx) => {
    const all = await notificationSettings(tx, ctx.workspaceId, ctx.session.userId);
    return Object.fromEntries(
      Object.entries(CATEGORY_KIND).map(([category, kind]) => {
        const s = all.find((x) => x.kind === kind);
        return [category, { inApp: s?.inApp ?? true, email: s ? s.email !== 'off' : true }];
      }),
    ) as WorkspaceSettings['notificationPrefs'];
  });
}

export async function savePrefsFor(
  ctx: WorkspaceCtx,
  prefs: WorkspaceSettings['notificationPrefs'],
) {
  return asMember(ctx, async (tx) => {
    for (const [category, pref] of Object.entries(prefs))
      await setNotificationPreference(tx, {
        workspaceId: ctx.workspaceId,
        userId: ctx.session.userId,
        kind: CATEGORY_KIND[category as NotificationCategory],
        pref: { inApp: pref.inApp, email: pref.email ? 'on' : 'off' },
      });
  });
}

// ---------- Audit log ----------

/** Words for an entry: entries written by the app carry them; the database's own get made. */
function auditWords(
  action: string,
  changes: Payload,
  subjectType: string | null,
): { subject: string; detail: string } {
  if (typeof changes.subject === 'string')
    return { subject: changes.subject, detail: str(changes.detail) };
  if (action === 'invitation.created')
    return {
      subject: str(changes.email, 'A new member'),
      detail: changes.role ? `As ${ROLE_LABELS[changes.role as Role]}` : '',
    };
  const subject =
    str(changes.number) ||
    str(changes.email) ||
    str(changes.name) ||
    str(changes.signer) ||
    (subjectType ? subjectType[0]!.toUpperCase() + subjectType.slice(1) : '—');
  const detail = Object.entries(changes)
    .filter(([k, v]) => !['number', 'email', 'name', 'signer'].includes(k) && v !== null)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
    .slice(0, 160);
  return { subject, detail };
}

export async function auditFor(ctx: WorkspaceCtx, filter: { action?: string; page?: number } = {}) {
  const size = 200;
  const page = Math.max(1, filter.page ?? 1);
  return asMember(ctx, async (tx) => {
    const [rows, total] = await Promise.all([
      listAuditLog(tx, ctx.workspaceId, {
        limit: size,
        offset: (page - 1) * size,
        action: filter.action,
      }),
      auditCount(tx, ctx.workspaceId, filter.action),
    ]);
    const n = Number(total);
    return {
      rows: rows.map((r): AuditEntry => {
        const changes = (r.changes ?? {}) as Payload;
        return {
          id: r.id,
          at: r.createdAt.toISOString(),
          actor: r.actorName ?? (str(changes.signer) || 'Agency OS'),
          action: r.action,
          ...auditWords(r.action, changes, r.subjectType),
          ip: r.ip,
        };
      }),
      total: n,
      pages: Math.max(1, Math.ceil(n / size)),
    };
  });
}

/** An entry for an action the database doesn't record itself, in the screen's words. */
export async function writeAudit(
  ctx: WorkspaceCtx,
  entry: { action: string; subject: string; detail: string; ip: string | null },
) {
  return asMember(ctx, (tx) =>
    addAuditEntry(tx, {
      workspaceId: ctx.workspaceId,
      actorId: ctx.session.userId,
      action: entry.action,
      changes: { subject: entry.subject, detail: entry.detail },
      ip: entry.ip,
    }),
  );
}
