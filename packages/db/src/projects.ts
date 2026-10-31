import {
  BLANK_TEMPLATE,
  projectProgress,
  SEVEN_PHASES,
  validateTemplate,
  type NotificationKey,
  type PhaseTemplate,
  type TemplatePhase,
} from '@agency-os/core';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import { queueEventEmails } from './email';
import { notify } from './platform';
import {
  activities,
  checklistItems,
  clientContacts,
  clients,
  gates,
  phases,
  phaseTemplates,
  profiles,
  projectMembers,
  projects,
  proposals,
} from './schema';

export type Project = typeof projects.$inferSelect;
export type Gate = typeof gates.$inferSelect;

export type NewProject = {
  clientId: string;
  name: string;
  type?: Project['type'];
  budgetMinor?: bigint | null;
  currency?: string;
  startOn?: string | null;
  dueOn?: string | null;
  leadMemberId?: string;
  memberIds?: string[];
  /** A built-in template key ('seven_phases', 'blank') or a saved template's id. */
  template?: string;
  /** A signed proposal starts the project with its first gate (Proposal accepted) approved. */
  proposalId?: string;
  isExample?: boolean;
};

/** A notification for the job runner to deliver with notify() (members can't write notifications). */
export type NotificationEvent = {
  kind: NotificationKey;
  workspaceId: string;
  userIds: string[];
  /** Portal contacts to email (client gates, the team's messages). */
  contactEmails: string[];
  payload: Record<string, unknown>;
  /** Identifies the event, so delivering it twice sends each email once. */
  key?: string;
};

async function templateFor(tx: Tx, key = 'seven_phases'): Promise<PhaseTemplate> {
  if (key === SEVEN_PHASES.key) return SEVEN_PHASES;
  if (key === BLANK_TEMPLATE.key) return BLANK_TEMPLATE;
  const [saved] = await tx.select().from(phaseTemplates).where(eq(phaseTemplates.id, key));
  if (!saved) throw new AccountError('template_not_found');
  return { key: saved.id, name: saved.name, phases: saved.phases as TemplatePhase[] };
}

/** Creates a project from a template: phases, the internal checklist and the gates. */
export async function createProject(
  tx: Tx,
  workspaceId: string,
  input: NewProject,
  actorId: string,
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new AccountError('project_name_required');
  const [client] = await tx
    .select({ currency: clients.currency })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), isNull(clients.deletedAt)));
  if (!client) throw new AccountError('client_not_found');
  const template = await templateFor(tx, input.template);
  let signed = false;
  if (input.proposalId) {
    const [p] = await tx
      .select({ status: proposals.status })
      .from(proposals)
      .where(eq(proposals.id, input.proposalId));
    signed = p?.status === 'signed';
  }
  const [primary] = await tx
    .select({ id: clientContacts.id })
    .from(clientContacts)
    .where(and(eq(clientContacts.clientId, input.clientId), eq(clientContacts.isPrimary, true)));

  const id = uuidv7();
  const lead = input.leadMemberId ?? actorId;
  await call(() =>
    tx.insert(projects).values({
      id,
      workspaceId,
      clientId: input.clientId,
      proposalId: input.proposalId ?? null,
      name,
      type: input.type ?? 'one_off',
      budgetMinor: input.budgetMinor ?? null,
      currency: (input.currency ?? client.currency).toUpperCase(),
      startOn: input.startOn ?? null,
      dueOn: input.dueOn ?? null,
      leadMemberId: lead,
      templateName: template.name,
      isExample: input.isExample ?? false,
      createdBy: actorId,
    }),
  );
  const members = [...new Set([lead, ...(input.memberIds ?? [])])];
  await call(() =>
    tx.insert(projectMembers).values(
      members.map((userId) => ({
        workspaceId,
        projectId: id,
        userId,
        roleOnProject: userId === lead ? 'lead' : null,
      })),
    ),
  );
  for (const [position, phase] of template.phases.entries()) {
    const phaseId = uuidv7();
    const preApproved = signed && position === 0 && phase.gate !== null;
    await tx.insert(phases).values({
      id: phaseId,
      workspaceId,
      projectId: id,
      name: phase.name,
      clientLine: phase.clientLine,
      deliverables: phase.deliverables,
      position,
      status: preApproved ? 'done' : 'not_started',
      isExample: input.isExample ?? false,
    });
    if (phase.checklist.length)
      await tx.insert(checklistItems).values(
        phase.checklist.map((title, i) => ({
          workspaceId,
          phaseId,
          title,
          position: i,
          isExample: input.isExample ?? false,
        })),
      );
    if (phase.gate)
      await call(() =>
        tx.insert(gates).values({
          workspaceId,
          phaseId,
          title: phase.gate!.title,
          approverType: phase.gate!.approver,
          approverContactId: phase.gate!.approver === 'client' ? (primary?.id ?? null) : null,
          status: preApproved ? 'approved' : 'not_started',
          isExample: input.isExample ?? false,
        }),
      );
  }
  await tx.insert(activities).values({
    workspaceId,
    subjectType: 'project',
    subjectId: id,
    kind: 'created',
    actorId,
    meta: { template: template.name },
  });
  return id;
}

async function checklistCounts(tx: Tx, phaseIds: string[]) {
  if (phaseIds.length === 0) return new Map<string, { done: number; total: number }>();
  const rows = await tx
    .select({
      phaseId: checklistItems.phaseId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(${checklistItems.doneAt})::int`,
    })
    .from(checklistItems)
    .where(inArray(checklistItems.phaseId, phaseIds))
    .groupBy(checklistItems.phaseId);
  return new Map(rows.map((r) => [r.phaseId, { done: r.done, total: r.total }]));
}

/** The project with its phases (checklist and gate each), members and progress. */
export async function getProject(tx: Tx, projectId: string) {
  return (await getProjects(tx, [projectId]))[0] ?? null;
}

/** Projects with their phases, checklists, gates and members, in five queries however many. */
export async function getProjects(tx: Tx, projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const rows = await tx.select().from(projects).where(inArray(projects.id, projectIds));
  if (rows.length === 0) return [];
  const found = rows.map((p) => p.id);
  const [phaseRows, members] = await Promise.all([
    tx.select().from(phases).where(inArray(phases.projectId, found)).orderBy(asc(phases.position)),
    tx.select().from(projectMembers).where(inArray(projectMembers.projectId, found)),
  ]);
  const ids = phaseRows.map((p) => p.id);
  const [items, gateRows] = ids.length
    ? await Promise.all([
        tx
          .select()
          .from(checklistItems)
          .where(inArray(checklistItems.phaseId, ids))
          .orderBy(asc(checklistItems.position)),
        tx.select().from(gates).where(inArray(gates.phaseId, ids)),
      ])
    : [[], []];
  const itemsOf = groupBy(items, (i) => i.phaseId);
  const gateOf = new Map(gateRows.map((g) => [g.phaseId, g]));
  const phasesOf = groupBy(phaseRows, (p) => p.projectId);
  const membersOf = groupBy(members, (m) => m.projectId);
  const order = new Map(projectIds.map((id, n) => [id, n]));
  return rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((project) => {
      const withParts = (phasesOf.get(project.id) ?? []).map((p) => ({
        ...p,
        checklist: itemsOf.get(p.id) ?? [],
        gate: gateOf.get(p.id) ?? null,
      }));
      return {
        ...project,
        phases: withParts,
        members: membersOf.get(project.id) ?? [],
        progress: projectProgress(
          withParts.map((p) => ({
            skipped: p.status === 'skipped',
            checklistTotal: p.checklist.length,
            checklistDone: p.checklist.filter((i) => i.doneAt).length,
          })),
        ),
      };
    });
}

function groupBy<T, K>(list: T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of list) {
    const k = key(item);
    const group = out.get(k);
    if (group) group.push(item);
    else out.set(k, [item]);
  }
  return out;
}

/** Phase id to name for these projects, in one query (for task lists). */
export async function phaseNames(tx: Tx, projectIds: string[]): Promise<Map<string, string>> {
  if (projectIds.length === 0) return new Map();
  const rows = await tx
    .select({ id: phases.id, name: phases.name })
    .from(phases)
    .where(inArray(phases.projectId, projectIds));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function listProjects(
  tx: Tx,
  workspaceId: string,
  filter: { status?: Project['status']; clientId?: string } = {},
) {
  const rows = await tx
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        isNull(projects.deletedAt),
        filter.status ? eq(projects.status, filter.status) : undefined,
        filter.clientId ? eq(projects.clientId, filter.clientId) : undefined,
      ),
    )
    .orderBy(sql`${projects.createdAt} desc`);
  if (rows.length === 0) return [];
  const phaseRows = await tx
    .select({ id: phases.id, projectId: phases.projectId, status: phases.status })
    .from(phases)
    .where(
      inArray(
        phases.projectId,
        rows.map((r) => r.id),
      ),
    );
  const counts = await checklistCounts(
    tx,
    phaseRows.map((p) => p.id),
  );
  return rows.map((project) => ({
    ...project,
    progress: projectProgress(
      phaseRows
        .filter((p) => p.projectId === project.id)
        .map((p) => ({
          skipped: p.status === 'skipped',
          checklistDone: counts.get(p.id)?.done ?? 0,
          checklistTotal: counts.get(p.id)?.total ?? 0,
        })),
    ),
  }));
}

export async function updateProject(
  tx: Tx,
  projectId: string,
  patch: Partial<
    Pick<
      Project,
      'name' | 'type' | 'budgetMinor' | 'startOn' | 'dueOn' | 'leadMemberId' | 'status' | 'health'
    >
  >,
) {
  const rows = await call(() =>
    tx.update(projects).set(patch).where(eq(projects.id, projectId)).returning({ id: projects.id }),
  );
  if (rows.length === 0) throw new AccountError('project_not_found');
}

export async function addProjectMember(tx: Tx, projectId: string, userId: string) {
  const [p] = await tx
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!p) throw new AccountError('project_not_found');
  await call(() =>
    tx
      .insert(projectMembers)
      .values({ workspaceId: p.workspaceId, projectId, userId })
      .onConflictDoNothing(),
  );
}

export async function removeProjectMember(tx: Tx, projectId: string, userId: string) {
  await tx
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
}

// ---- Checklist and phases ----

export async function setChecklistItem(tx: Tx, itemId: string, done: boolean, actorId: string) {
  const rows = await tx
    .update(checklistItems)
    .set(done ? { doneAt: new Date(), doneBy: actorId } : { doneAt: null, doneBy: null })
    .where(eq(checklistItems.id, itemId))
    .returning({ id: checklistItems.id });
  if (rows.length === 0) throw new AccountError('checklist_item_not_found');
}

export async function addChecklistItem(tx: Tx, phaseId: string, title: string) {
  const [phase] = await tx
    .select({ workspaceId: phases.workspaceId })
    .from(phases)
    .where(eq(phases.id, phaseId));
  if (!phase) throw new AccountError('phase_not_found');
  const [last] = await tx
    .select({ n: sql<number>`coalesce(max(${checklistItems.position}) + 1, 0)::int` })
    .from(checklistItems)
    .where(eq(checklistItems.phaseId, phaseId));
  const id = uuidv7();
  await call(() =>
    tx.insert(checklistItems).values({
      id,
      workspaceId: phase.workspaceId,
      phaseId,
      title: title.trim(),
      position: last?.n ?? 0,
    }),
  );
  return id;
}

/** Starts a phase; the database refuses it while an earlier gate isn't approved. */
export async function startPhase(tx: Tx, phaseId: string) {
  const rows = await call(() =>
    tx
      .update(phases)
      .set({ status: 'in_progress' })
      .where(and(eq(phases.id, phaseId), eq(phases.status, 'not_started')))
      .returning({ id: phases.id }),
  );
  if (rows.length === 0) throw new AccountError('phase_not_found');
}

/** Finishes a phase without a gate (a gated phase finishes when its gate is approved). */
export async function completePhase(tx: Tx, phaseId: string) {
  const [gate] = await tx
    .select({ status: gates.status })
    .from(gates)
    .where(eq(gates.phaseId, phaseId));
  if (gate && gate.status !== 'approved') throw new AccountError('gate_not_approved');
  const rows = await call(() =>
    tx
      .update(phases)
      .set({ status: 'done' })
      .where(eq(phases.id, phaseId))
      .returning({ id: phases.id }),
  );
  if (rows.length === 0) throw new AccountError('phase_not_found');
}

export async function skipPhase(tx: Tx, phaseId: string, skip = true) {
  await call(() => tx.execute(sql`select skip_phase(${phaseId}::uuid, ${skip})`));
}

// ---- Gates ----

async function projectOfGate(tx: Tx, gate: Gate) {
  const [row] = await tx
    .select({ project: projects })
    .from(phases)
    .innerJoin(projects, eq(projects.id, phases.projectId))
    .where(eq(phases.id, gate.phaseId));
  return row!.project;
}

/**
 * The project lead asks for sign-off. Returns the notification to send: the client contact
 * (by email, and in the portal) or the internal approver.
 */
export async function requestGateApproval(
  tx: Tx,
  gateId: string,
  message?: string,
): Promise<NotificationEvent> {
  const [gate] = await call(() =>
    tx.execute<Gate>(sql`select * from request_gate(${gateId}::uuid, ${message ?? null})`),
  );
  const [g] = await tx
    .select()
    .from(gates)
    .where(eq(gates.id, (gate as unknown as { id: string }).id));
  const project = await projectOfGate(tx, g!);
  let contactEmails: string[] = [];
  if (g!.approverType === 'client') {
    const contacts = await tx
      .select({ email: clientContacts.email })
      .from(clientContacts)
      .where(
        and(
          eq(clientContacts.clientId, project.clientId),
          g!.approverContactId
            ? eq(clientContacts.id, g!.approverContactId)
            : eq(clientContacts.isPrimary, true),
        ),
      );
    contactEmails = contacts.flatMap((c) => (c.email ? [c.email] : []));
  }
  return {
    kind: 'gate.requested',
    key: `${g!.id}:${g!.requestedAt?.toISOString() ?? ''}`,
    workspaceId: g!.workspaceId,
    userIds: g!.approverType === 'internal' && g!.approverUserId ? [g!.approverUserId] : [],
    contactEmails,
    payload: {
      gateId: g!.id,
      gate: g!.title,
      projectId: project.id,
      project: project.name,
      message: g!.requestMessage,
      lead: await leadName(tx, project.leadMemberId),
    },
  };
}

/** The project lead's notification for a client's decision; jobs deliver it (service role). */
export async function gateDecidedEvent(tx: Tx, gateId: string): Promise<NotificationEvent> {
  return decided(tx, gateId);
}

async function decided(tx: Tx, gateId: string): Promise<NotificationEvent> {
  const [g] = await tx.select().from(gates).where(eq(gates.id, gateId));
  const project = await projectOfGate(tx, g!);
  const [client] = await tx
    .select({ name: clients.name })
    .from(clients)
    .where(eq(clients.id, project.clientId));
  return {
    kind: 'gate.decided',
    key: `${g!.id}:${g!.decidedAt?.toISOString() ?? ''}`,
    workspaceId: g!.workspaceId,
    userIds: project.leadMemberId ? [project.leadMemberId] : [],
    contactEmails: [],
    payload: {
      gateId: g!.id,
      gate: g!.title,
      projectId: project.id,
      project: project.name,
      client: client?.name ?? null,
      outcome: g!.status,
      comment: g!.decisionComment,
    },
  };
}

/** An internal gate, decided by its approver (or anyone with gates.approve when none is named). */
export async function decideGate(tx: Tx, gateId: string, approve: boolean, comment?: string) {
  await call(() =>
    tx.execute(
      sql`select id from decide_gate_internal(${gateId}::uuid, ${approve}, ${comment ?? null})`,
    ),
  );
  return decided(tx, gateId);
}

/** A client gate, decided in the portal. Asking for changes needs a comment. */
export async function decideGateAsClient(
  tx: Tx,
  gateId: string,
  approve: boolean,
  comment?: string,
) {
  const [row] = await call(() =>
    tx.execute<{ id: string; workspace_id: string }>(
      sql`select id, workspace_id from decide_gate_as_client(${gateId}::uuid, ${approve}, ${comment ?? null})`,
    ),
  );
  return { gateId: row!.id, workspaceId: row!.workspace_id, kind: 'gate.decided' as const };
}

/**
 * Jobs deliver a member's or client's event as the service role (see NotificationEvent): the
 * in-app notifications now, and the emails into the outbox for the email job.
 */
export async function deliverEvent(tx: Tx, event: NotificationEvent) {
  const result = await notify(tx, {
    workspaceId: event.workspaceId,
    userIds: event.userIds,
    kind: event.kind,
    payload: event.payload,
  });
  await queueEventEmails(tx, event, result.email);
  return result;
}

async function leadName(tx: Tx, userId: string | null) {
  if (!userId) return null;
  const [p] = await tx
    .select({ name: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, userId));
  return p?.name ?? null;
}

export type PortalProject = {
  id: string;
  name: string;
  clientId: string;
  status: string;
  dueOn: string | null;
  leadName: string | null;
  progress: number;
  phases: {
    name: string;
    clientLine: string | null;
    status: string;
    position: number;
    deliverables: string[];
    gate: {
      id: string;
      title: string;
      status: string;
      approverType: string;
      requestMessage: string | null;
      requestedAt: string | null;
      decidedAt: string | null;
      comment: string | null;
    } | null;
  }[];
};

/** For the portal: the signed-in contact's projects, without internal details. */
export async function portalProjects(tx: Tx): Promise<PortalProject[]> {
  const [row] = await tx.execute<{ p: PortalProject[] }>(sql`select portal_projects() as p`);
  return row?.p ?? [];
}

export async function projectActivities(tx: Tx, workspaceId: string, projectId: string) {
  return tx
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.workspaceId, workspaceId),
        eq(activities.subjectType, 'project'),
        eq(activities.subjectId, projectId),
      ),
    )
    .orderBy(sql`${activities.createdAt} desc`, sql`${activities.id} desc`);
}

/** Saves a project's phases, checklists and gates as the workspace's own template. */
export async function saveTemplate(tx: Tx, projectId: string, name: string, actorId: string) {
  const project = await getProject(tx, projectId);
  if (!project) throw new AccountError('project_not_found');
  const template = {
    name: name.trim(),
    phases: project.phases
      .filter((p) => p.status !== 'skipped')
      .map<TemplatePhase>((p) => ({
        name: p.name,
        clientLine: p.clientLine ?? '',
        checklist: p.checklist.map((i) => i.title),
        deliverables: p.deliverables,
        gate: p.gate ? { title: p.gate.title, approver: p.gate.approverType } : null,
      })),
  };
  const errors = validateTemplate(template);
  if (errors.length) throw new AccountError('template_invalid', errors.join(' '));
  const id = uuidv7();
  await call(() =>
    tx
      .insert(phaseTemplates)
      .values({ id, workspaceId: project.workspaceId, ...template, createdBy: actorId }),
  );
  return id;
}
