// Server only. Leads and clients on the database, in the shapes the screens use (see ../index.ts
// for the example-mode versions). Every query runs as the member, so RLS decides what they see.
import {
  AccountError,
  addLeadActivity,
  clientActivities,
  convertLeadToClient,
  createClient as dbCreateClient,
  createLead as dbCreateLead,
  getClient as dbGetClient,
  getLead as dbGetLead,
  invitePortalContact,
  leadActivities,
  listClients,
  listInvoices,
  listLeads,
  listMembers,
  listProjects,
  listStages,
  moveLead as dbMoveLead,
  setFollowUp,
  type Lead as DbLead,
  type Stage,
  type Tx,
} from '@agency-os/db';
import type { ClientInput, LeadInput } from '../../forms';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import type { Activity, ActivityKind, Lead, StageId } from '../types';
import { clientFromDb } from './map';

// ---------- Stages ----------

/**
 * The screens show five fixed stages; the database keeps each workspace's own (seeded with the
 * same five). Won and Lost match by kind, the open stages by order: first New, second
 * Contacted, the rest Proposal. Renaming or adding stages comes with the stage editor.
 */
function stageIdOf(stage: Stage, stages: Stage[]): StageId {
  if (stage.kind === 'won') return 'won';
  if (stage.kind === 'lost') return 'lost';
  const index = stages.filter((s) => s.kind === 'open').findIndex((s) => s.id === stage.id);
  return index === 0 ? 'new' : index === 1 ? 'contacted' : 'proposal';
}

function stageFor(id: StageId, stages: Stage[]): Stage {
  if (id === 'won' || id === 'lost') return stages.find((s) => s.kind === id)!;
  const open = stages.filter((s) => s.kind === 'open');
  const index = { new: 0, contacted: 1, proposal: 2 }[id];
  return open[Math.min(index, open.length - 1)]!;
}

// ---------- Names and activity ----------

async function namesOf(tx: Tx, workspaceId: string) {
  const members = await listMembers(tx, workspaceId);
  return new Map(members.map((m) => [m.userId, m.name ?? 'A former member']));
}

type DbActivity = Awaited<ReturnType<typeof leadActivities>>[number];

/** A timeline entry in the words the example store uses; null for ones the timeline skips. */
function activityFromDb(a: DbActivity, names: Map<string, string>): Activity | null {
  const meta = (a.meta ?? {}) as Record<string, unknown>;
  const who = a.actorId ? (names.get(a.actorId) ?? 'A former member') : 'Someone';
  const item = (kind: ActivityKind, text: string, by = who): Activity => ({
    id: a.id,
    kind,
    who: by,
    text,
    at: a.createdAt.toISOString(),
  });
  switch (a.kind) {
    case 'created':
      return item('created', a.subjectType === 'client' ? 'added the client' : 'added the lead');
    case 'enquiry':
      return item('enquiry', 'sent an enquiry from the website form', String(meta.name ?? who));
    case 'imported':
      return item('imported', 'imported the lead');
    case 'stage_change':
      if (meta.lostReason)
        return item('lost', a.body ? `marked it lost: ${a.body}` : 'marked it lost');
      return item('stage', `moved it to ${String(meta.to ?? 'another stage')}`);
    case 'converted':
      return item('won', 'marked it won and made it a client');
    case 'note':
    case 'call':
    case 'email':
    case 'whatsapp':
    case 'meeting':
      return item('note', a.body ?? '');
    case 'portal_invited':
      return item('sent', `invited ${String(meta.email ?? 'a contact')} to the portal`);
    case 'quote_created':
      return item('created', 'made a quote');
    case 'proposal_sent':
    case 'quote_sent':
      return item('sent', a.kind === 'quote_sent' ? 'sent the quote' : 'sent the proposal');
    case 'proposal_signed':
      return item('signed', 'signed the proposal');
    case 'proposal_declined':
      return item('declined', 'declined the proposal');
    default:
      return null;
  }
}

const timeline = (rows: DbActivity[], names: Map<string, string>) =>
  rows.map((a) => activityFromDb(a, names)).filter((a): a is Activity => a !== null);

// ---------- Leads ----------

function leadFromDb(
  l: DbLead,
  stage: StageId,
  names: Map<string, string>,
  activities?: Activity[],
): Lead {
  // Lists don't load the timeline; a won or lost lead still says when it was decided (its last
  // change), which the dashboard's 90-day win rate counts from.
  const decided: Activity[] =
    stage === 'won' || stage === 'lost'
      ? [{ id: `${l.id}-d`, kind: stage, who: '', text: '', at: l.updatedAt.toISOString() }]
      : [];
  return {
    id: l.id,
    name: l.name,
    company: l.company,
    email: l.email,
    phone: l.phone,
    stage,
    valueMinor: l.valueMinor ?? 0n,
    source: l.source,
    service: l.service ?? '',
    owner: l.ownerId ? (names.get(l.ownerId) ?? 'A former member') : 'Nobody yet',
    followUpAt: l.nextFollowUpAt?.toISOString() ?? null,
    notes: l.notes ?? '',
    lostReason: l.lostReason,
    clientId: l.convertedClientId,
    activities: activities ?? decided,
    createdAt: l.createdAt.toISOString(),
    example: l.isExample || undefined,
  };
}

/** Every lead in the workspace, newest first, in the screens' shape (board and table). */
export async function leadList(ctx: WorkspaceCtx): Promise<Lead[]> {
  return asMember(ctx, async (tx) => {
    const [stages, rows, names] = await Promise.all([
      listStages(tx, ctx.workspaceId),
      listLeads(tx, ctx.workspaceId, { limit: 1000 }),
      namesOf(tx, ctx.workspaceId),
    ]);
    return rows.map(({ lead }) =>
      leadFromDb(
        lead,
        stageIdOf(
          stages.find((s) => s.id === lead.stageId)!,
          stages,
        ),
        names,
      ),
    );
  });
}

export async function leadDetail(ctx: WorkspaceCtx, id: string): Promise<Lead | null> {
  return asMember(ctx, async (tx) => {
    const found = await dbGetLead(tx, id);
    if (!found || found.workspaceId !== ctx.workspaceId) return null;
    const [stages, names] = await Promise.all([
      listStages(tx, ctx.workspaceId),
      namesOf(tx, ctx.workspaceId),
    ]);
    const stage = stageIdOf(
      stages.find((s) => s.id === found.stageId)!,
      stages,
    );
    return leadFromDb(
      found,
      stage,
      names,
      timeline(await leadActivities(tx, ctx.workspaceId, id), names),
    );
  });
}

/** Follow-ups are at 11:00 IST on the chosen day. */
const followUpAt = (on: string | null) => (on ? new Date(`${on}T11:00:00+05:30`) : null);

export async function createLeadFor(ctx: WorkspaceCtx, input: LeadInput): Promise<string> {
  return asMember(ctx, (tx) =>
    dbCreateLead(
      tx,
      ctx.workspaceId,
      {
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        source: input.source,
        service: input.service || null,
        valueMinor: input.valueMinor,
        notes: input.notes || null,
        nextFollowUpAt: input.followUpOn ? followUpAt(input.followUpOn) : undefined,
      },
      ctx.session.userId,
    ),
  );
}

async function moveTo(
  tx: Tx,
  ctx: WorkspaceCtx,
  id: string,
  to: StageId,
  lost?: { reason: NonNullable<Lead['lostReason']>; note: string },
) {
  const stages = await listStages(tx, ctx.workspaceId);
  await dbMoveLead(tx, {
    leadId: id,
    stageId: stageFor(to, stages).id,
    lostReason: lost?.reason,
    lostNote: lost?.note || undefined,
    actorId: ctx.session.userId,
  });
}

export async function moveLeadFor(ctx: WorkspaceCtx, id: string, to: StageId) {
  return asMember(ctx, (tx) => moveTo(tx, ctx, id, to));
}

export async function markLeadLostFor(
  ctx: WorkspaceCtx,
  id: string,
  reason: NonNullable<Lead['lostReason']>,
  note: string,
) {
  return asMember(ctx, (tx) => moveTo(tx, ctx, id, 'lost', { reason, note }));
}

export async function addLeadNoteFor(ctx: WorkspaceCtx, id: string, note: string) {
  return asMember(ctx, (tx) =>
    addLeadActivity(tx, {
      workspaceId: ctx.workspaceId,
      leadId: id,
      kind: 'note',
      body: note,
      actorId: ctx.session.userId,
    }),
  );
}

export async function setLeadFollowUpFor(ctx: WorkspaceCtx, id: string, on: string | null) {
  return asMember(ctx, (tx) => setFollowUp(tx, id, followUpAt(on), ctx.session.userId));
}

/** Won: moves the lead to Won and makes it a client in one go. Returns the client id. */
export async function winLeadFor(ctx: WorkspaceCtx, id: string): Promise<string> {
  return asMember(ctx, async (tx) => {
    await moveTo(tx, ctx, id, 'won');
    return (await convertLeadToClient(tx, id, ctx.session.userId)).clientId;
  });
}

// ---------- Clients ----------

type Money = { billed: bigint; outstanding: bigint; drafts: bigint };

function moneyByClient(rows: Awaited<ReturnType<typeof listInvoices>>) {
  const money = new Map<string, Money>();
  for (const r of rows) {
    if (r.status === 'cancelled') continue;
    const m = money.get(r.clientId) ?? { billed: 0n, outstanding: 0n, drafts: 0n };
    if (r.status === 'draft') m.drafts += r.totalMinor;
    else {
      m.billed += r.totalMinor;
      m.outstanding += r.dueMinor;
    }
    money.set(r.clientId, m);
  }
  return money;
}

const NO_MONEY: Money = { billed: 0n, outstanding: 0n, drafts: 0n };

export async function clientList(ctx: WorkspaceCtx, now = new Date()) {
  return asMember(ctx, async (tx) => {
    const [rows, invoices, projects] = await Promise.all([
      listClients(tx, ctx.workspaceId, { limit: 1000 }),
      listInvoices(tx, ctx.workspaceId, now),
      listProjects(tx, ctx.workspaceId),
    ]);
    const money = moneyByClient(invoices);
    const full = await Promise.all(rows.map((c) => dbGetClient(tx, c.id)));
    return full
      .filter((c) => c !== null)
      .map((c) => ({
        client: clientFromDb(c),
        money: money.get(c.id) ?? NO_MONEY,
        projects: projects.filter((p) => p.clientId === c.id).length,
      }));
  });
}

export async function clientDetail(ctx: WorkspaceCtx, id: string, now = new Date()) {
  return asMember(ctx, async (tx) => {
    const c = await dbGetClient(tx, id);
    if (!c || c.workspaceId !== ctx.workspaceId || c.deletedAt) return null;
    const [invoices, activity, names] = await Promise.all([
      listInvoices(tx, ctx.workspaceId, now),
      clientActivities(tx, ctx.workspaceId, id),
      namesOf(tx, ctx.workspaceId),
    ]);
    return {
      client: { ...clientFromDb(c), activities: timeline(activity, names) },
      money: moneyByClient(invoices).get(id) ?? NO_MONEY,
    };
  });
}

export async function createClientFor(ctx: WorkspaceCtx, input: ClientInput): Promise<string> {
  return asMember(ctx, (tx) =>
    dbCreateClient(
      tx,
      ctx.workspaceId,
      {
        name: input.name,
        gstin: input.gstin,
        stateCode: input.stateCode,
        country: input.country,
        currency: input.currency,
        billingAddress: input.city ? { city: input.city } : null,
        notes: input.notes || null,
        contact: { name: input.contactName, email: input.email, phone: input.phone },
      },
      ctx.session.userId,
    ),
  );
}

/** Gives the primary contact portal access (the sign-in link email waits for Resend). */
export async function inviteToPortalFor(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, async (tx) => {
    const c = await dbGetClient(tx, id);
    if (!c || c.workspaceId !== ctx.workspaceId) throw new AccountError('client_not_found');
    const contact = c.contacts[0];
    if (!contact) throw new AccountError('portal_email_required');
    await invitePortalContact(tx, contact.id, ctx.session.userId);
  });
}
