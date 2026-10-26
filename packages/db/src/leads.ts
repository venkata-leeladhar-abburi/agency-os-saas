import {
  LEAD_SOURCE_LABELS,
  nextFollowUp,
  normalizePhone,
  positionBetween,
  positions,
  toDecimalString,
  minorDigits,
  type LeadImportRow,
  type LeadSource,
  type LostReason,
} from '@agency-os/core';
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import { withService, type Db, type Tx } from './client';
import { checkPlanLimit, notify } from './platform';
import { activities, enquiryForms, leads, memberships, pipelineStages, workspaces } from './schema';
import { hashToken, newToken } from './tokens';

export type Stage = typeof pipelineStages.$inferSelect;
export type Lead = typeof leads.$inferSelect;

// ---- Stages ----

export async function listStages(tx: Tx, workspaceId: string): Promise<Stage[]> {
  return tx
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.workspaceId, workspaceId))
    .orderBy(asc(pipelineStages.position), asc(pipelineStages.id));
}

/** Adds an open stage after the given one (or before Won when none is given). */
export async function addStage(
  tx: Tx,
  workspaceId: string,
  name: string,
  afterStageId?: string,
): Promise<string> {
  const stages = await listStages(tx, workspaceId);
  const index = afterStageId
    ? stages.findIndex((s) => s.id === afterStageId)
    : stages.findIndex((s) => s.kind !== 'open') - 1;
  const position = positionBetween(
    stages[index]?.position ?? null,
    stages[index + 1]?.position ?? null,
  );
  const id = uuidv7();
  await call(() =>
    tx
      .insert(pipelineStages)
      .values({ id, workspaceId, name: name.trim(), position, kind: 'open' }),
  );
  return id;
}

export async function renameStage(tx: Tx, stageId: string, name: string) {
  const rows = await tx
    .update(pipelineStages)
    .set({ name: name.trim() })
    .where(eq(pipelineStages.id, stageId))
    .returning({ id: pipelineStages.id });
  return rows.length === 1;
}

/** Moves a stage to sit between two neighbours (null at either end). */
export async function moveStage(
  tx: Tx,
  stageId: string,
  between: { before: string | null; after: string | null },
) {
  const position = await between2(tx, pipelineStages, between);
  const rows = await tx
    .update(pipelineStages)
    .set({ position })
    .where(eq(pipelineStages.id, stageId))
    .returning({ id: pipelineStages.id });
  return rows.length === 1;
}

export async function deleteStage(tx: Tx, stageId: string) {
  const [used] = await tx
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.stageId, stageId))
    .limit(1);
  if (used) throw new AccountError('stage_has_leads');
  const rows = await call(() =>
    tx
      .delete(pipelineStages)
      .where(eq(pipelineStages.id, stageId))
      .returning({ id: pipelineStages.id }),
  );
  return rows.length === 1;
}

/** A fractional key between the rows with these ids (their positions), in the given table. */
async function between2(
  tx: Tx,
  table: typeof pipelineStages | typeof leads,
  { before, after }: { before: string | null; after: string | null },
): Promise<string> {
  const ids = [before, after].filter((x): x is string => x !== null);
  const rows = ids.length
    ? await tx
        .select({ id: table.id, position: table.position })
        .from(table)
        .where(inArray(table.id, ids))
    : [];
  const pos = (id: string | null) =>
    id ? (rows.find((r) => r.id === id)?.position ?? null) : null;
  const a = pos(before);
  const b = pos(after);
  // Equal or crossed keys (two inserts at once) fall back to placing after `before`.
  return a !== null && b !== null && a >= b ? positionBetween(a, null) : positionBetween(a, b);
}

// ---- Leads ----

export type NewLead = {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: LeadSource;
  valueMinor?: bigint | null;
  currency?: string;
  service?: string | null;
  notes?: string | null;
  ownerId?: string | null;
  stageId?: string;
  /** null for no follow-up; omitted for the default (next working day, 11:00). */
  nextFollowUpAt?: Date | null;
  isExample?: boolean;
};

async function workspaceSettings(tx: Tx, workspaceId: string) {
  const [ws] = await tx
    .select({ timeZone: workspaces.timeZone, currency: workspaces.baseCurrency })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!ws) throw new AccountError('no_access');
  return ws;
}

function checkContact(input: NewLead) {
  const name = input.name?.trim() || input.company?.trim();
  if (!name) throw new AccountError('lead_name_required');
  if (!input.email?.trim() && !input.phone?.trim()) throw new AccountError('lead_contact_required');
  return name;
}

async function firstOpenStage(tx: Tx, workspaceId: string) {
  const stage = (await listStages(tx, workspaceId)).find((s) => s.kind === 'open');
  if (!stage) throw new AccountError('stage_not_found');
  return stage;
}

async function topOfStage(tx: Tx, stageId: string) {
  const [first] = await tx
    .select({ position: leads.position })
    .from(leads)
    .where(eq(leads.stageId, stageId))
    .orderBy(asc(leads.position))
    .limit(1);
  return positionBetween(null, first?.position ?? null);
}

/** Adds a lead at the top of its stage (first open stage by default), with the default follow-up. */
export async function createLead(
  tx: Tx,
  workspaceId: string,
  input: NewLead,
  actorId: string | null,
  { now = new Date(), enforceLimit = true }: { now?: Date; enforceLimit?: boolean } = {},
): Promise<string> {
  const name = checkContact(input);
  const ws = await workspaceSettings(tx, workspaceId);
  const stage = input.stageId
    ? (await listStages(tx, workspaceId)).find((s) => s.id === input.stageId)
    : await firstOpenStage(tx, workspaceId);
  if (!stage) throw new AccountError('stage_not_found');
  if (enforceLimit && stage.kind === 'open') {
    const limit = await checkPlanLimit(tx, workspaceId, 'open_leads');
    if (!limit.allowed) throw new AccountError('plan_limit', limit.message);
  }
  const id = uuidv7();
  const position = await topOfStage(tx, stage.id);
  await call(() =>
    tx.insert(leads).values({
      id,
      workspaceId,
      stageId: stage.id,
      position,
      name,
      company: input.company?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() ? normalizePhone(input.phone) : null,
      source: input.source ?? 'other',
      valueMinor: input.valueMinor ?? null,
      currency: input.currency ?? ws.currency,
      service: input.service ?? null,
      notes: input.notes ?? null,
      ownerId: input.ownerId === undefined ? actorId : input.ownerId,
      nextFollowUpAt:
        input.nextFollowUpAt === undefined && stage.kind === 'open'
          ? nextFollowUp(now, ws.timeZone)
          : (input.nextFollowUpAt ?? null),
      isExample: input.isExample ?? false,
      createdBy: actorId,
    }),
  );
  await logActivity(tx, {
    workspaceId,
    leadId: id,
    kind: 'created',
    actorId,
    isExample: input.isExample,
  });
  return id;
}

export type LeadPatch = Partial<
  Pick<
    Lead,
    | 'name'
    | 'company'
    | 'email'
    | 'phone'
    | 'source'
    | 'valueMinor'
    | 'currency'
    | 'service'
    | 'notes'
    | 'ownerId'
  >
>;

export async function updateLead(tx: Tx, leadId: string, patch: LeadPatch) {
  const clean = {
    ...patch,
    ...(patch.email !== undefined ? { email: patch.email?.trim().toLowerCase() || null } : {}),
    ...(patch.phone !== undefined
      ? { phone: patch.phone?.trim() ? normalizePhone(patch.phone) : null }
      : {}),
  };
  const rows = await call(() =>
    tx.update(leads).set(clean).where(eq(leads.id, leadId)).returning({ id: leads.id }),
  );
  if (rows.length === 0) throw new AccountError('lead_not_found');
}

export type LeadMove = {
  leadId: string;
  stageId: string;
  /** The neighbours in the target stage after the move (null at either end). */
  before?: string | null;
  after?: string | null;
  lostReason?: LostReason;
  lostNote?: string;
  actorId: string;
};

/** Drag on the board: change stage and/or order. Stage changes go on the timeline. */
export async function moveLead(tx: Tx, move: LeadMove) {
  const [lead] = await tx
    .select({
      id: leads.id,
      workspaceId: leads.workspaceId,
      stageId: leads.stageId,
      isExample: leads.isExample,
    })
    .from(leads)
    .where(and(eq(leads.id, move.leadId), isNull(leads.deletedAt)));
  if (!lead) throw new AccountError('lead_not_found');
  const stages = await listStages(tx, lead.workspaceId);
  const from = stages.find((s) => s.id === lead.stageId)!;
  const to = stages.find((s) => s.id === move.stageId);
  if (!to) throw new AccountError('stage_not_found');
  if (to.kind === 'open' && from.kind !== 'open') {
    const limit = await checkPlanLimit(tx, lead.workspaceId, 'open_leads');
    if (!limit.allowed) throw new AccountError('plan_limit', limit.message);
  }
  const position =
    move.before === undefined && move.after === undefined
      ? await topOfStage(tx, to.id)
      : await between2(tx, leads, { before: move.before ?? null, after: move.after ?? null });
  await call(() =>
    tx
      .update(leads)
      .set({
        stageId: to.id,
        position,
        lostReason: move.lostReason ?? null,
        lostNote: move.lostNote ?? null,
        // A closed lead needs no follow-up.
        ...(to.kind !== 'open' ? { nextFollowUpAt: null } : {}),
      })
      .where(eq(leads.id, lead.id)),
  );
  if (from.id !== to.id) {
    await logActivity(tx, {
      workspaceId: lead.workspaceId,
      leadId: lead.id,
      kind: 'stage_change',
      actorId: move.actorId,
      body: move.lostNote,
      meta: { from: from.name, to: to.name, toKind: to.kind, lostReason: move.lostReason ?? null },
      isExample: lead.isExample,
    });
  }
}

export async function setFollowUp(tx: Tx, leadId: string, at: Date | null, actorId: string) {
  const [lead] = await tx
    .update(leads)
    .set({ nextFollowUpAt: at })
    .where(eq(leads.id, leadId))
    .returning({ workspaceId: leads.workspaceId });
  if (!lead) throw new AccountError('lead_not_found');
  await logActivity(tx, {
    workspaceId: lead.workspaceId,
    leadId,
    kind: at ? 'follow_up_set' : 'follow_up_done',
    actorId,
    meta: at ? { at: at.toISOString() } : {},
  });
}

/** Soft delete (to the trash); needs leads.delete. */
export async function deleteLead(tx: Tx, leadId: string) {
  return trash(tx, leadId, new Date());
}

export async function restoreLead(tx: Tx, leadId: string) {
  return trash(tx, leadId, null);
}

async function trash(tx: Tx, leadId: string, at: Date | null) {
  const [lead] = await tx
    .select({ workspaceId: leads.workspaceId })
    .from(leads)
    .where(eq(leads.id, leadId));
  if (!lead) throw new AccountError('lead_not_found');
  const [allowed] = await tx.execute<{ ok: boolean }>(
    sql`select has_permission(${lead.workspaceId}::uuid, 'leads.delete') as ok`,
  );
  if (!allowed?.ok) throw new AccountError('no_access');
  await tx.update(leads).set({ deletedAt: at }).where(eq(leads.id, leadId));
}

// ---- Activity ----

export type ActivityKind = 'note' | 'call' | 'email' | 'whatsapp' | 'meeting';

export async function logActivity(
  tx: Tx,
  input: {
    workspaceId: string;
    leadId: string;
    kind: string;
    actorId: string | null;
    body?: string | null;
    meta?: Record<string, unknown>;
    isExample?: boolean;
  },
) {
  await tx.insert(activities).values({
    workspaceId: input.workspaceId,
    subjectType: 'lead',
    subjectId: input.leadId,
    kind: input.kind,
    body: input.body ?? null,
    actorId: input.actorId,
    meta: input.meta ?? {},
    isExample: input.isExample ?? false,
  });
}

/** A note, call, email or message logged by a member. */
export async function addLeadActivity(
  tx: Tx,
  input: { workspaceId: string; leadId: string; kind: ActivityKind; body: string; actorId: string },
) {
  await logActivity(tx, input);
}

export async function leadActivities(tx: Tx, workspaceId: string, leadId: string) {
  return tx
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.workspaceId, workspaceId),
        eq(activities.subjectType, 'lead'),
        eq(activities.subjectId, leadId),
      ),
    )
    .orderBy(desc(activities.createdAt), desc(activities.id));
}

// ---- Board, table and Today ----

export type LeadFilters = {
  ownerId?: string;
  sources?: LeadSource[];
  search?: string;
  stageIds?: string[];
};

function filterWhere(workspaceId: string, f: LeadFilters) {
  const term = f.search?.trim();
  return and(
    eq(leads.workspaceId, workspaceId),
    isNull(leads.deletedAt),
    f.ownerId ? eq(leads.ownerId, f.ownerId) : undefined,
    f.sources?.length ? inArray(leads.source, f.sources) : undefined,
    f.stageIds?.length ? inArray(leads.stageId, f.stageIds) : undefined,
    term
      ? or(
          ilike(leads.name, `%${escapeLike(term)}%`),
          ilike(leads.company, `%${escapeLike(term)}%`),
          ilike(leads.email, `%${escapeLike(term)}%`),
          ilike(leads.phone, `%${escapeLike(term.replace(/\s/g, ''))}%`),
        )
      : undefined,
  );
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export type BoardColumn = {
  stage: Stage;
  leads: Lead[];
  count: number;
  /** Value per currency; most workspaces have one. */
  totals: { currency: string; valueMinor: bigint }[];
};

/** The pipeline: every stage in order with its leads and the column count and value. */
export async function leadBoard(tx: Tx, workspaceId: string, filters: LeadFilters = {}) {
  const stages = await listStages(tx, workspaceId);
  const rows = await tx
    .select()
    .from(leads)
    .where(filterWhere(workspaceId, filters))
    .orderBy(asc(leads.position), asc(leads.createdAt));
  return stages.map<BoardColumn>((stage) => {
    const inStage = rows.filter((l) => l.stageId === stage.id);
    const totals = new Map<string, bigint>();
    for (const l of inStage)
      if (l.valueMinor !== null)
        totals.set(l.currency, (totals.get(l.currency) ?? 0n) + l.valueMinor);
    return {
      stage,
      leads: inStage,
      count: inStage.length,
      totals: [...totals].map(([currency, valueMinor]) => ({ currency, valueMinor })),
    };
  });
}

export type LeadSort = 'created' | 'name' | 'value' | 'follow_up';

export async function listLeads(
  tx: Tx,
  workspaceId: string,
  filters: LeadFilters & { sort?: LeadSort; limit?: number; offset?: number } = {},
) {
  const order = {
    created: [desc(leads.createdAt)],
    name: [asc(leads.name)],
    value: [sql`${leads.valueMinor} desc nulls last`],
    follow_up: [sql`${leads.nextFollowUpAt} asc nulls last`],
  }[filters.sort ?? 'created'];
  return tx
    .select({ lead: leads, stageName: pipelineStages.name, stageKind: pipelineStages.kind })
    .from(leads)
    .innerJoin(pipelineStages, eq(pipelineStages.id, leads.stageId))
    .where(filterWhere(workspaceId, filters))
    .orderBy(...order, asc(leads.id))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);
}

/** Follow-ups due by `until` (for Today), oldest first; optionally only one owner's. */
export async function followUpsDue(tx: Tx, workspaceId: string, until: Date, ownerId?: string) {
  return tx
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.workspaceId, workspaceId),
        isNull(leads.deletedAt),
        isNotNull(leads.nextFollowUpAt),
        lte(leads.nextFollowUpAt, until),
        ownerId ? eq(leads.ownerId, ownerId) : undefined,
      ),
    )
    .orderBy(asc(leads.nextFollowUpAt));
}

// ---- Import and export ----

/**
 * Adds checked CSV rows (core toLeadImport) in one go. Stage names match the workspace's stages
 * (case ignored); anything else lands in the first open stage. Refused as a whole if it would go
 * over the plan's open-lead limit.
 */
export async function importLeads(
  tx: Tx,
  workspaceId: string,
  rows: LeadImportRow[],
  actorId: string,
): Promise<{ created: number }> {
  if (rows.length === 0) return { created: 0 };
  const ws = await workspaceSettings(tx, workspaceId);
  const stages = await listStages(tx, workspaceId);
  const first = stages.find((s) => s.kind === 'open')!;
  const stageFor = (name: string | null) =>
    stages.find((s) => s.name.toLowerCase() === name?.trim().toLowerCase() && s.kind === 'open') ??
    first;
  const openCount = rows.filter((r) => stageFor(r.stage).kind === 'open').length;
  const limit = await checkPlanLimit(tx, workspaceId, 'open_leads', openCount);
  if (!limit.allowed) throw new AccountError('plan_limit', limit.message);

  const byStage = new Map<string, LeadImportRow[]>();
  for (const r of rows)
    byStage.set(stageFor(r.stage).id, [...(byStage.get(stageFor(r.stage).id) ?? []), r]);
  const values: (typeof leads.$inferInsert)[] = [];
  for (const [stageId, group] of byStage) {
    const [last] = await tx
      .select({ position: leads.position })
      .from(leads)
      .where(eq(leads.stageId, stageId))
      .orderBy(desc(leads.position))
      .limit(1);
    const keys = positions(group.length, last?.position ?? null);
    group.forEach((r, i) =>
      values.push({
        id: uuidv7(),
        workspaceId,
        stageId,
        position: keys[i]!,
        name: r.name,
        company: r.company,
        email: r.email,
        phone: r.phone,
        source: r.source,
        valueMinor: r.valueMinor,
        currency: ws.currency,
        service: r.service,
        notes: r.notes,
        ownerId: actorId,
        createdBy: actorId,
      }),
    );
  }
  await call(() => tx.insert(leads).values(values));
  await tx.insert(activities).values(
    values.map((v) => ({
      workspaceId,
      subjectType: 'lead',
      subjectId: v.id!,
      kind: 'created',
      actorId,
      meta: { via: 'import' },
    })),
  );
  return { created: values.length };
}

/** Rows for the leads CSV export, in the words people read (stage name, source label, ₹ as a number). */
export async function exportLeads(tx: Tx, workspaceId: string) {
  const rows = await listLeads(tx, workspaceId, { limit: 100_000 });
  return rows.map(({ lead, stageName }) => ({
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    stage: stageName,
    source: LEAD_SOURCE_LABELS[lead.source],
    value:
      lead.valueMinor === null
        ? null
        : toDecimalString(lead.valueMinor, minorDigits(lead.currency)),
    currency: lead.currency,
    service: lead.service,
    notes: lead.notes,
    next_follow_up: lead.nextFollowUpAt,
    lost_reason: lead.lostReason,
    created: lead.createdAt,
  }));
}

// ---- Enquiry form ----

/** Creates (or replaces) the workspace's public form link; returns the token for the URL. */
export async function createEnquiryForm(tx: Tx, workspaceId: string) {
  const { token, hash } = newToken();
  await tx
    .update(enquiryForms)
    .set({ isActive: false })
    .where(eq(enquiryForms.workspaceId, workspaceId));
  const id = uuidv7();
  await call(() => tx.insert(enquiryForms).values({ id, workspaceId, publicTokenHash: hash }));
  return { id, token };
}

export type Enquiry = {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  budget?: string;
  message?: string;
  consent: boolean;
};

/**
 * A submission from the public form (no sign-in). Finds the form's workspace, then adds the lead
 * as the service role for that workspace only, and tells the owners. Enquiries are kept even past
 * the plan's lead limit, so no client enquiry is lost.
 */
export async function submitEnquiry(db: Db, token: string, enquiry: Enquiry, now = new Date()) {
  if (!enquiry.consent) throw new AccountError('consent_required');
  const workspaceId = await db.transaction(async (tx) => {
    await tx.execute(sql`set local role anon`);
    const [row] = await tx.execute<{ ws: string | null }>(
      sql`select enquiry_form_workspace(${hashToken(token)}) as ws`,
    );
    return row?.ws ?? null;
  });
  if (!workspaceId) throw new AccountError('enquiry_closed');
  return withService(db, workspaceId, async (tx, ws) => {
    const notes = [enquiry.message, enquiry.budget ? `Budget: ${enquiry.budget}` : null]
      .filter(Boolean)
      .join('\n\n');
    const leadId = await createLead(
      tx,
      ws,
      {
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        company: enquiry.company,
        service: enquiry.service,
        notes: notes || null,
        source: 'website',
        ownerId: null,
      },
      null,
      { now, enforceLimit: false },
    );
    await logActivity(tx, {
      workspaceId: ws,
      leadId,
      kind: 'enquiry',
      actorId: null,
      meta: { consent: true, consentAt: now.toISOString() },
    });
    const owners = await tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.workspaceId, ws),
          eq(memberships.role, 'owner'),
          eq(memberships.status, 'active'),
        ),
      );
    await notify(tx, {
      workspaceId: ws,
      userIds: owners.map((o) => o.userId),
      kind: 'lead.enquiry',
      payload: { leadId, name: enquiry.name },
    });
    return leadId;
  });
}
