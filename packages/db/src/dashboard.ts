import { convertMoney, zonedTime } from '@agency-os/core';
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, sql } from 'drizzle-orm';
import { AccountError } from './accounts';
import type { Tx } from './client';
import { followUpsDue } from './leads';
import { localDate, workspaceTax } from './sales-docs';
import {
  activities,
  checklistItems,
  gates,
  invoices,
  leads,
  payments,
  phases,
  pipelineStages,
  projects,
  tasks,
} from './schema';
import { teamOverview } from './tasks';

/**
 * The owner dashboard and Today (E1.9). Every query runs as the signed-in user, so each number
 * only counts what that person may see. Money is shown in the workspace's base currency,
 * converted at the invoice's own rate.
 */

/** The first day of this month and of last month (YYYY-MM-DD) in the workspace's time zone. */
function monthBounds(now: Date, timeZone: string) {
  const [y, m] = localDate(now, timeZone).split('-').map(Number) as [number, number];
  const day1 = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`;
  return { startDay: day1(y, m), prevDay: m === 1 ? day1(y - 1, 12) : day1(y, m - 1) };
}

/** An invoice amount in the base currency, at the invoice's own exchange rate. */
function toBase(
  minor: bigint,
  inv: { currency: string; baseCurrency: string; exchangeRate: string | null },
) {
  if (inv.currency === inv.baseCurrency || !inv.exchangeRate) return minor;
  return convertMoney(
    { amountMinor: minor, currency: inv.currency },
    inv.exchangeRate,
    inv.baseCurrency,
  ).amountMinor;
}

export type Metric = { valueMinor: bigint; count: number };

export type DashboardMetrics = {
  currency: string;
  /** Payments received this calendar month (workspace time zone), and last month for the change. */
  revenue: Metric & { previousMinor: bigint; changePercent: number | null };
  /** Owed on issued invoices that aren't due yet. */
  pending: Metric;
  /** Owed on invoices past their due date. */
  overdue: Metric;
  /** Open leads in the base currency (leads in other currencies are counted apart). */
  pipeline: Metric & { otherCurrencyLeads: number };
  /** Won ÷ (won + lost) for leads closed in the last 90 days; null when none closed. */
  winRate: { percent: number | null; won: number; lost: number };
};

export async function dashboardMetrics(
  tx: Tx,
  workspaceId: string,
  now = new Date(),
): Promise<DashboardMetrics> {
  const ws = await workspaceTax(tx, workspaceId);
  const today = localDate(now, ws.timeZone);
  const { startDay, prevDay } = monthBounds(now, ws.timeZone);

  const paid = await tx
    .select({
      amountMinor: payments.amountMinor,
      receivedOn: payments.receivedOn,
      currency: invoices.currency,
      baseCurrency: invoices.baseCurrency,
      exchangeRate: invoices.exchangeRate,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(
      and(
        eq(payments.workspaceId, workspaceId),
        gte(payments.receivedOn, prevDay),
        lte(payments.receivedOn, today),
      ),
    );
  let revenue = 0n;
  let previous = 0n;
  let revenueCount = 0;
  for (const p of paid) {
    const base = toBase(p.amountMinor, p);
    if (p.receivedOn >= startDay) {
      revenue += base;
      revenueCount += 1;
    } else previous += base;
  }

  const owed = await tx
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        isNull(invoices.deletedAt),
        inArray(invoices.status, ['issued', 'partially_paid']),
        eq(invoices.proforma, false),
      ),
    );
  const pending = { valueMinor: 0n, count: 0 };
  const overdue = { valueMinor: 0n, count: 0 };
  for (const inv of owed) {
    const bucket = inv.dueOn && inv.dueOn < today ? overdue : pending;
    bucket.valueMinor += toBase(inv.totalMinor - inv.amountPaidMinor, inv);
    bucket.count += 1;
  }

  const open = await tx
    .select({ valueMinor: leads.valueMinor, currency: leads.currency })
    .from(leads)
    .innerJoin(pipelineStages, eq(pipelineStages.id, leads.stageId))
    .where(
      and(
        eq(leads.workspaceId, workspaceId),
        isNull(leads.deletedAt),
        eq(pipelineStages.kind, 'open'),
      ),
    );
  const pipeline = { valueMinor: 0n, count: 0, otherCurrencyLeads: 0 };
  for (const l of open) {
    if (l.currency !== ws.baseCurrency) pipeline.otherCurrencyLeads += 1;
    else {
      pipeline.valueMinor += l.valueMinor ?? 0n;
      pipeline.count += 1;
    }
  }

  // The last close (to Won or Lost) of each lead in the last 90 days decides how it counts.
  const closes = await tx
    .select({ leadId: activities.subjectId, kind: sql<string>`${activities.meta} ->> 'toKind'` })
    .from(activities)
    .where(
      and(
        eq(activities.workspaceId, workspaceId),
        eq(activities.subjectType, 'lead'),
        eq(activities.kind, 'stage_change'),
        gte(activities.createdAt, new Date(now.getTime() - 90 * 86_400_000)),
      ),
    )
    .orderBy(asc(activities.createdAt));
  const last = new Map<string, string>();
  for (const c of closes)
    if (c.kind === 'won' || c.kind === 'lost') last.set(c.leadId, c.kind);
    else last.delete(c.leadId);
  const won = [...last.values()].filter((k) => k === 'won').length;
  const lost = last.size - won;

  const changePercent = previous === 0n ? null : Number(((revenue - previous) * 100n) / previous);
  return {
    currency: ws.baseCurrency,
    revenue: { valueMinor: revenue, count: revenueCount, previousMinor: previous, changePercent },
    pending,
    overdue,
    pipeline,
    winRate: { percent: last.size === 0 ? null : Math.round((won * 100) / last.size), won, lost },
  };
}

export type AtRiskProject = {
  id: string;
  name: string;
  clientId: string;
  progress: number;
  /** Why it is at risk, in the words the dashboard shows. */
  reasons: string[];
};

/**
 * Active projects that are late: open tasks past their due date, a phase past its end date that
 * isn't done, or the project itself past its due date.
 */
export async function projectsAtRisk(
  tx: Tx,
  workspaceId: string,
  now = new Date(),
): Promise<AtRiskProject[]> {
  const ws = await workspaceTax(tx, workspaceId);
  const today = localDate(now, ws.timeZone);
  const active = await tx
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        isNull(projects.deletedAt),
        eq(projects.status, 'active'),
      ),
    );
  if (active.length === 0) return [];
  const ids = active.map((p) => p.id);
  const lateTasks = await tx
    .select({ projectId: tasks.projectId, n: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        inArray(tasks.projectId, ids),
        isNull(tasks.deletedAt),
        ne(tasks.status, 'done'),
        lt(tasks.dueOn, today),
      ),
    )
    .groupBy(tasks.projectId);
  const latePhases = await tx
    .select({ projectId: phases.projectId, name: phases.name, gate: gates.title })
    .from(phases)
    .leftJoin(gates, eq(gates.phaseId, phases.id))
    .where(
      and(
        inArray(phases.projectId, ids),
        lt(phases.endsOn, today),
        inArray(phases.status, ['not_started', 'in_progress']),
      ),
    );
  const progressRows = await tx
    .select({
      projectId: phases.projectId,
      total: sql<number>`count(${checklistItems.id})::int`,
      done: sql<number>`count(${checklistItems.doneAt})::int`,
    })
    .from(phases)
    .leftJoin(checklistItems, eq(checklistItems.phaseId, phases.id))
    .where(and(inArray(phases.projectId, ids), ne(phases.status, 'skipped')))
    .groupBy(phases.projectId);

  return active
    .map((p) => {
      const reasons: string[] = [];
      const t = lateTasks.find((r) => r.projectId === p.id)?.n ?? 0;
      if (t) reasons.push(`${t} ${t === 1 ? 'task' : 'tasks'} overdue`);
      for (const ph of latePhases.filter((r) => r.projectId === p.id))
        reasons.push(ph.gate ? `${ph.gate} is late` : `${ph.name} is past its end date`);
      if (p.dueOn && p.dueOn < today) reasons.push('Past the project due date');
      const pr = progressRows.find((r) => r.projectId === p.id);
      return {
        id: p.id,
        name: p.name,
        clientId: p.clientId,
        progress: pr && pr.total ? Math.floor((pr.done * 100) / pr.total) : 0,
        reasons,
      };
    })
    .filter((p) => p.reasons.length > 0);
}

/** Open tasks per member (the dashboard's team load). */
export async function teamLoad(tx: Tx, workspaceId: string) {
  const team = await teamOverview(tx, workspaceId);
  return team
    .filter((m) => m.status === 'active')
    .map((m) => ({ userId: m.user_id, name: m.name, openTasks: m.open_tasks }));
}

export type TodayView = {
  date: string;
  followUps: Awaited<ReturnType<typeof followUpsDue>>;
  tasks: (typeof tasks.$inferSelect)[];
  /** Gates waiting on the signed-in user (internal approvals), and on clients for their projects. */
  gatesForMe: (typeof gates.$inferSelect)[];
  gatesWithClients: (typeof gates.$inferSelect)[];
  invoicesDue: (typeof invoices.$inferSelect)[];
};

/**
 * Today for one member: follow-ups and tasks due today or earlier, gates waiting, and invoices
 * due today or overdue. Meetings come with Google Calendar later.
 */
export async function todayFor(
  tx: Tx,
  workspaceId: string,
  userId: string,
  now = new Date(),
): Promise<TodayView> {
  const ws = await workspaceTax(tx, workspaceId);
  const today = localDate(now, ws.timeZone);
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const endOfDay = zonedTime({ year: y, month: m, day: d, hour: 23, minute: 59 }, ws.timeZone);
  const [role] = await tx.execute<{ scope: string | null }>(
    sql`select permission_scope(${workspaceId}::uuid, 'leads.read')::text as scope`,
  );
  if (role === undefined) throw new AccountError('no_access');

  const followUps = role.scope
    ? (await followUpsDue(tx, workspaceId, endOfDay)).filter(
        (l) => l.ownerId === userId || l.ownerId === null,
      )
    : [];
  const myTasks = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        ne(tasks.status, 'done'),
        isNotNull(tasks.dueOn),
        lte(tasks.dueOn, today),
      ),
    )
    .orderBy(asc(tasks.dueOn));
  const [approver] = await tx.execute<{ ok: boolean }>(
    sql`select has_permission(${workspaceId}::uuid, 'gates.approve') as ok`,
  );
  const waiting = await tx
    .select({ gate: gates, lead: projects.leadMemberId })
    .from(gates)
    .innerJoin(phases, eq(phases.id, gates.phaseId))
    .innerJoin(projects, eq(projects.id, phases.projectId))
    .where(
      and(
        eq(gates.workspaceId, workspaceId),
        eq(gates.status, 'waiting'),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(asc(gates.requestedAt));
  const gatesForMe = waiting
    .filter(
      (w) =>
        w.gate.approverType === 'internal' &&
        (w.gate.approverUserId === userId || (w.gate.approverUserId === null && approver?.ok)),
    )
    .map((w) => w.gate);
  const gatesWithClients = waiting
    .filter((w) => w.gate.approverType === 'client' && (w.lead === userId || approver?.ok))
    .map((w) => w.gate);
  const invoicesDue = await tx
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        isNull(invoices.deletedAt),
        inArray(invoices.status, ['issued', 'partially_paid']),
        eq(invoices.proforma, false),
        lte(invoices.dueOn, today),
      ),
    )
    .orderBy(asc(invoices.dueOn));
  return { date: today, followUps, tasks: myTasks, gatesForMe, gatesWithClients, invoicesDue };
}
