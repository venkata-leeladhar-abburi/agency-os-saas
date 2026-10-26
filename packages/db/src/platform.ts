import {
  channelsFor,
  checkLimit,
  NOTIFICATION_KEYS,
  NOTIFICATION_KINDS,
  type ChannelPreference,
  type EmailDefault,
  type LimitCheck,
  type LimitedResource,
  type NotificationKey,
} from '@agency-os/core';
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { AccountError } from './accounts';
import type { Tx } from './client';
import {
  activities,
  auditLog,
  clientContacts,
  clients,
  invitations,
  leads,
  memberships,
  notificationPreferences,
  notifications,
  pipelineStages,
  profiles,
  workspaces,
} from './schema';

// ---- Notifications (in-app list and per-kind settings) ----

export async function listNotifications(
  tx: Tx,
  workspaceId: string,
  { unreadOnly = false, limit = 50 }: { unreadOnly?: boolean; limit?: number } = {},
) {
  return tx
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        unreadOnly ? isNull(notifications.readAt) : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(tx: Tx, workspaceId: string) {
  const [row] = await tx
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.workspaceId, workspaceId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/** Marks the given notifications read, or all of them. RLS limits it to the member's own. */
export async function markRead(tx: Tx, workspaceId: string, ids?: string[]) {
  const rows = await tx
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        isNull(notifications.readAt),
        ids ? inArray(notifications.id, ids) : undefined,
      ),
    )
    .returning({ id: notifications.id });
  return rows.length;
}

export type NotificationSetting = {
  kind: NotificationKey;
  label: string;
  area: string;
  inApp: boolean;
  email: EmailDefault;
};

/** Every kind with the member's channels (their changes over the defaults), for Settings. */
export async function notificationSettings(
  tx: Tx,
  workspaceId: string,
  userId: string,
): Promise<NotificationSetting[]> {
  const saved = await tx
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.workspaceId, workspaceId),
        eq(notificationPreferences.userId, userId),
      ),
    );
  const byKind = new Map(saved.map((p) => [p.kind, toPreference(p)]));
  return NOTIFICATION_KEYS.map((kind) => ({
    kind,
    label: NOTIFICATION_KINDS[kind].label,
    area: NOTIFICATION_KINDS[kind].area,
    ...channelsFor(kind, byKind.get(kind)),
  }));
}

function toPreference(p: { inApp: boolean | null; email: string | null }): ChannelPreference {
  return {
    inApp: p.inApp ?? undefined,
    email: (p.email as EmailDefault | null) ?? undefined,
  };
}

export async function setNotificationPreference(
  tx: Tx,
  input: { workspaceId: string; userId: string; kind: NotificationKey; pref: ChannelPreference },
) {
  const values = {
    inApp: input.pref.inApp ?? null,
    email: input.pref.email ?? null,
  };
  await tx
    .insert(notificationPreferences)
    .values({ workspaceId: input.workspaceId, userId: input.userId, kind: input.kind, ...values })
    .onConflictDoUpdate({
      target: [
        notificationPreferences.workspaceId,
        notificationPreferences.userId,
        notificationPreferences.kind,
      ],
      set: values,
    });
}

/**
 * Creates in-app notifications for the people who get them and returns who should get an
 * email (now or in the digest). Jobs only: run inside withService for this workspace.
 */
export async function notify(
  tx: Tx,
  input: {
    workspaceId: string;
    userIds: string[];
    kind: NotificationKey;
    payload: Record<string, unknown>;
  },
) {
  if (input.userIds.length === 0) return { inApp: [], email: [], digest: [] };
  const saved = await tx
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.workspaceId, input.workspaceId),
        eq(notificationPreferences.kind, input.kind),
        inArray(notificationPreferences.userId, input.userIds),
      ),
    );
  const byUser = new Map(saved.map((p) => [p.userId, toPreference(p)]));
  const result = { inApp: [] as string[], email: [] as string[], digest: [] as string[] };
  for (const userId of input.userIds) {
    const channels = channelsFor(input.kind, byUser.get(userId));
    if (channels.inApp) result.inApp.push(userId);
    if (channels.email === 'on') result.email.push(userId);
    if (channels.email === 'digest') result.digest.push(userId);
  }
  if (result.inApp.length > 0) {
    await tx.insert(notifications).values(
      result.inApp.map((userId) => ({
        workspaceId: input.workspaceId,
        userId,
        kind: input.kind,
        payload: input.payload,
      })),
    );
  }
  return result;
}

// ---- Plans and limits ----

type Counter = (tx: Tx, workspaceId: string) => Promise<number>;

/** Members count active memberships plus invitations still waiting to be accepted. */
const countMembers: Counter = async (tx, workspaceId) => {
  const [m] = await tx
    .select({ n: count() })
    .from(memberships)
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.status, 'active')));
  const [i] = await tx
    .select({ n: count() })
    .from(invitations)
    .where(
      and(
        eq(invitations.workspaceId, workspaceId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    );
  return (m?.n ?? 0) + (i?.n ?? 0);
};

/** Each later milestone adds the counter for its resource (leads in M8, clients in M9, …). */
/** Open leads: not deleted, in an open stage. */
const countOpenLeads: Counter = async (tx, workspaceId) => {
  const [row] = await tx
    .select({ n: count() })
    .from(leads)
    .innerJoin(pipelineStages, eq(pipelineStages.id, leads.stageId))
    .where(
      and(
        eq(leads.workspaceId, workspaceId),
        isNull(leads.deletedAt),
        eq(pipelineStages.kind, 'open'),
      ),
    );
  return row?.n ?? 0;
};

/** Clients with at least one contact who can use the portal. */
const countPortalClients: Counter = async (tx, workspaceId) => {
  const [row] = await tx
    .select({ n: sql<number>`count(distinct ${clientContacts.clientId})::int` })
    .from(clientContacts)
    .innerJoin(clients, and(eq(clients.id, clientContacts.clientId), isNull(clients.deletedAt)))
    .where(
      and(
        eq(clientContacts.workspaceId, workspaceId),
        isNotNull(clientContacts.portalInvitedAt),
        isNull(clientContacts.portalRevokedAt),
      ),
    );
  return row?.n ?? 0;
};

export const USAGE_COUNTERS: Partial<Record<LimitedResource, Counter>> = {
  members: countMembers,
  open_leads: countOpenLeads,
  portal_clients: countPortalClients,
};

export async function checkPlanLimit(
  tx: Tx,
  workspaceId: string,
  resource: LimitedResource,
  adding = 1,
  /** A count the caller already has (monthly counts depend on the date). */
  { used }: { used?: number } = {},
): Promise<LimitCheck> {
  const counter = USAGE_COUNTERS[resource];
  if (!counter && used === undefined) throw new Error(`No usage counter for ${resource} yet`);
  const [ws] = await tx
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!ws) throw new AccountError('no_access');
  return checkLimit(ws.plan, resource, used ?? (await counter!(tx, workspaceId)), adding);
}

// ---- Audit log ----

/** Newest first, with the actor's name. RLS shows it only to roles with audit.read. */
export async function listAuditLog(
  tx: Tx,
  workspaceId: string,
  { limit = 50, before }: { limit?: number; before?: Date } = {},
) {
  return tx
    .select({
      id: auditLog.id,
      action: auditLog.action,
      subjectType: auditLog.subjectType,
      subjectId: auditLog.subjectId,
      changes: auditLog.changes,
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
      actorId: auditLog.actorId,
      actorName: profiles.fullName,
    })
    .from(auditLog)
    .leftJoin(profiles, eq(profiles.id, auditLog.actorId))
    .where(
      and(
        eq(auditLog.workspaceId, workspaceId),
        before ? lt(auditLog.createdAt, before) : undefined,
      ),
    )
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit);
}

// ---- Data export ----

/** Tables added after M9, read in one go; secrets (token hashes, signing codes) stay out. */
async function moreTables(tx: Tx, workspaceId: string) {
  const all = async <T extends Record<string, unknown>>(table: string, omit: string[] = []) => {
    const rows = await tx.execute<T>(
      sql`select * from ${sql.identifier(table)} where workspace_id = ${workspaceId}`,
    );
    return rows.map((r) =>
      Object.fromEntries(Object.entries(r).filter(([k]) => !omit.includes(k))),
    );
  };
  return {
    quotes: await all('quotes'),
    quote_items: await all('quote_items'),
    proposals: await all('proposals', ['public_token_hash']),
    signatures: await all('signatures'),
    projects: await all('projects'),
    project_members: await all('project_members'),
    phases: await all('phases'),
    checklist_items: await all('checklist_items'),
    gates: await all('gates'),
    tasks: await all('tasks'),
    comments: await all('comments'),
    daily_updates: await all('daily_updates'),
    invoices: await all('invoices', ['public_token_hash']),
    invoice_items: await all('invoice_items'),
    payments: await all('payments'),
    payment_links: await all('payment_links'),
    reminders: await all('reminders'),
  };
}

export type WorkspaceExport = {
  format: 'agency-os-export';
  version: 1;
  exportedAt: string;
  workspaceId: string;
  tables: Record<string, Record<string, unknown>[]>;
};

/**
 * Every record of the workspace as JSON (the app also offers each table as CSV via core's
 * toCsv). Needs data.export. Secrets such as invitation token hashes are never included.
 * Later milestones add their tables here.
 */
export async function exportWorkspace(
  tx: Tx,
  workspaceId: string,
  actorId: string,
): Promise<WorkspaceExport> {
  const [allowed] = await tx.execute<{ ok: boolean }>(
    sql`select has_permission(${workspaceId}::uuid, 'data.export') as ok`,
  );
  if (!allowed?.ok) throw new AccountError('no_access');

  const workspace = await tx.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  const members = await tx
    .select({
      id: memberships.id,
      userId: memberships.userId,
      name: profiles.fullName,
      role: memberships.role,
      status: memberships.status,
      createdAt: memberships.createdAt,
    })
    .from(memberships)
    .leftJoin(profiles, eq(profiles.id, memberships.userId))
    .where(eq(memberships.workspaceId, workspaceId));
  const invites = await tx
    .select({
      id: invitations.id,
      email: invitations.email,
      phone: invitations.phone,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      revokedAt: invitations.revokedAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(eq(invitations.workspaceId, workspaceId));
  const audit = await tx.select().from(auditLog).where(eq(auditLog.workspaceId, workspaceId));
  const stages = await tx
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.workspaceId, workspaceId));
  const leadRows = await tx.select().from(leads).where(eq(leads.workspaceId, workspaceId));
  const clientRows = await tx.select().from(clients).where(eq(clients.workspaceId, workspaceId));
  const contactRows = await tx
    .select()
    .from(clientContacts)
    .where(eq(clientContacts.workspaceId, workspaceId));
  const activityRows = await tx
    .select()
    .from(activities)
    .where(eq(activities.workspaceId, workspaceId));

  await tx.insert(auditLog).values({ workspaceId, actorId, action: 'data.exported' });
  return {
    format: 'agency-os-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaceId,
    tables: {
      workspace,
      members,
      invitations: invites,
      audit_log: audit,
      pipeline_stages: stages,
      leads: leadRows,
      clients: clientRows,
      client_contacts: contactRows,
      ...(await moreTables(tx, workspaceId)),
      activities: activityRows,
    },
  };
}
