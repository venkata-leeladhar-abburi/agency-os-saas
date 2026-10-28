// Server only. The client portal on the database, in the shapes the portal pages use (see
// ../portal.ts for the example-mode versions). Reads and writes run as the portal contact, so
// the portal policies decide what they see; notifications go out with the service role.
import {
  AccountError,
  decideGateAsClient,
  deliverEvent,
  gateDecidedEvent,
  messagePostedEvent,
  portalInvoiceList,
  portalProjects,
  portalWorkspace,
  postMessage,
  projectMessages,
  updateMyContact,
  withService,
  type NotificationEvent,
  type PortalInvoiceFull,
  type PortalProject,
} from '@agency-os/db';
import { formatDate, formatMoney } from '@agency-os/core';
import { asContact, type PortalCtx } from '../../server/portal';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import type { NeedsYou, Outcome, PortalProjectView } from '../portal';
import type { Client, GateDecision, Invoice, Message, PaymentMethod } from '../types';
import { invoiceState, relativeTime } from '../views';
import { settingsFromDb } from './map';

async function deliver(db: PortalCtx['db'], workspaceId: string, events: NotificationEvent[]) {
  for (const event of events)
    if (event.userIds.length) await withService(db, workspaceId, (tx) => deliverEvent(tx, event));
}

/** An error the database raised, in words; anything else is a real failure. */
async function refusable(run: () => Promise<void>): Promise<Outcome> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    if (error instanceof AccountError) return { ok: false, error: error.message };
    throw error;
  }
}

// ---------- Projects ----------

const isDone = (status: string) => status === 'done' || status === 'skipped';

function progressOf(p: PortalProject) {
  const phases = p.phases.map((ph) => ph.name);
  const index = p.phases.findIndex((ph) => !isDone(ph.status));
  const current = index === -1 ? Math.max(phases.length - 1, 0) : index;
  const done = p.phases.filter((ph) => isDone(ph.status)).length;
  return {
    phases,
    current,
    percent: phases.length ? Math.round((done / phases.length) * 100) : 0,
  };
}

/** The client's own sign-offs: the gates they approve, never the team's internal ones. */
function viewOf(p: PortalProject, contact: string): PortalProjectView {
  const { current } = progressOf(p);
  const gate = p.phases[current]?.gate;
  const open =
    gate?.approverType === 'client' &&
    (gate.status === 'waiting' || gate.status === 'changes_requested');
  const history: GateDecision[] = p.phases
    .flatMap((ph) => (ph.gate ? [{ phase: ph.name, gate: ph.gate }] : []))
    .filter(
      ({ gate: g }) =>
        g.approverType === 'client' &&
        g.decidedAt &&
        (g.status === 'approved' || g.status === 'changes_requested'),
    )
    .map(({ phase, gate: g }) => ({
      title: g.title,
      phase,
      decision: g.status === 'approved' ? ('approved' as const) : ('changes' as const),
      by: contact,
      comment: g.comment,
      at: new Date(g.decidedAt!).toISOString(),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
  return {
    id: p.id,
    name: p.name,
    lead: p.leadName ?? 'The team',
    gate:
      open && gate
        ? {
            title: gate.title,
            status: gate.status === 'waiting' ? 'waiting' : 'changes',
            approver: contact,
            sentAt: gate.requestedAt ? new Date(gate.requestedAt).toISOString() : null,
          }
        : null,
    gateHistory: history,
  };
}

function messageOf(projectId: string, m: Awaited<ReturnType<typeof projectMessages>>[number]) {
  return {
    id: m.id,
    projectId,
    who: m.authorName,
    fromClient: m.fromClient,
    text: m.body,
    at: m.createdAt.toISOString(),
  } satisfies Message;
}

async function ownProjects(pc: PortalCtx) {
  const all = await asContact(pc, (tx) => portalProjects(tx));
  return all.filter((p) => p.clientId === pc.clientId);
}

export async function portalProjectFor(pc: PortalCtx, id: string) {
  const p = (await ownProjects(pc)).find((x) => x.id === id);
  if (!p) return null;
  const thread = await asContact(pc, (tx) => projectMessages(tx, id));
  const progress = progressOf(p);
  return {
    project: viewOf(p, pc.client.contact_name),
    ...progress,
    phaseName: progress.phases[progress.current] ?? '',
    messages: thread.map((m) => messageOf(id, m)),
  };
}

export async function decideGateFor(
  pc: PortalCtx,
  projectId: string,
  decision: 'approved' | 'changes',
  comment: string,
): Promise<Outcome> {
  const p = (await ownProjects(pc)).find((x) => x.id === projectId);
  if (!p) return { ok: false, error: 'This project isn’t yours.' };
  const gate = p.phases[progressOf(p).current]?.gate;
  if (!gate || gate.approverType !== 'client' || gate.status !== 'waiting')
    return { ok: false, error: 'There’s nothing waiting for your approval.' };
  if (decision === 'changes' && !comment.trim())
    return { ok: false, error: 'Say what should change, so the team knows what to do.' };
  const result = await refusable(async () => {
    await asContact(pc, (tx) =>
      decideGateAsClient(tx, gate.id, decision === 'approved', comment.trim() || undefined),
    );
  });
  if (!result.ok) return result;
  const event = await withService(pc.db, pc.workspaceId, (tx) => gateDecidedEvent(tx, gate.id));
  await deliver(pc.db, pc.workspaceId, [event]);
  return result;
}

// ---------- Invoices ----------

/** The client as their invoices show them (their own details; nothing internal). */
function clientOf(pc: PortalCtx): Client {
  const c = pc.client;
  return {
    id: c.client_id,
    name: c.client_name,
    contactName: c.contact_name,
    email: c.contact_email,
    phone: c.contact_phone,
    city: c.client_city,
    country: c.client_country,
    currency: c.client_currency,
    gstin: c.client_gstin,
    stateCode: c.client_state_code,
    notes: '',
    portal: 'active',
    portalVisitedAt: null,
    createdAt: '',
    activities: [],
  };
}

function invoiceOf(i: PortalInvoiceFull): Invoice {
  return {
    id: i.id,
    number: i.number,
    clientId: i.clientId,
    currency: i.currency,
    issuedOn: i.issueOn,
    dueOn: i.dueOn,
    lines: i.items.map((it) => ({
      description: it.description,
      sac: it.sacCode ?? undefined,
      quantity: Number(it.quantity),
      rateMinor: it.rateMinor,
      discountMinor: it.discountMinor,
      taxRateBp: it.taxRateBp,
    })),
    exchangeRate: i.exchangeRate,
    payments: i.payments.map((p) => ({
      id: p.id,
      amountMinor: p.amountMinor,
      receivedOn: p.receivedOn,
      method: p.method as PaymentMethod,
      reference: null,
    })),
    reminders: false,
    remindersSent: [],
    payToken: '',
    createdAt: i.issueOn,
  };
}

function invoiceViewOf(i: PortalInvoiceFull, now: Date) {
  const invoice = invoiceOf(i);
  return {
    invoice,
    totals: i.totals,
    state: invoiceState(invoice, i.totals.total.amountMinor, now),
  };
}

async function ownInvoices(pc: PortalCtx) {
  const all = await asContact(pc, (tx) => portalInvoiceList(tx));
  return all.filter((i) => i.clientId === pc.clientId);
}

export async function portalInvoicesFor(pc: PortalCtx, now = new Date()) {
  return (await ownInvoices(pc)).map((i) => invoiceViewOf(i, now));
}

export async function portalInvoiceFor(pc: PortalCtx, id: string, now = new Date()) {
  const found = (await ownInvoices(pc)).find((i) => i.id === id);
  if (!found) return null;
  const ws = await asContact(pc, (tx) => portalWorkspace(tx, pc.workspaceId));
  if (!ws) return null;
  const client = clientOf(pc);
  // The invoice keeps the place of supply it was issued with.
  if (found.placeOfSupplyCode) client.stateCode = found.placeOfSupplyCode;
  return { ...invoiceViewOf(found, now), client, settings: settingsFromDb(ws) };
}

// ---------- Home ----------

export async function portalHomeFor(pc: PortalCtx, slug: string, now = new Date()) {
  const base = `/p/${slug}`;
  const [projects, invoices] = await Promise.all([ownProjects(pc), portalInvoicesFor(pc, now)]);
  const contact = pc.client.contact_name;
  const views = projects.map((p) => viewOf(p, contact));
  const needs: NeedsYou[] = [];
  for (const v of views)
    if (v.gate?.status === 'waiting')
      needs.push({
        id: `gate-${v.id}`,
        kind: 'approve',
        title: `Approve: ${v.gate.title}`,
        detail: `${v.name} · shared ${v.gate.sentAt ? formatDate(v.gate.sentAt, { year: false }) : ''} by ${v.lead}`,
        href: `${base}/projects/${v.id}`,
      });
  for (const v of invoices) {
    if (v.state.dueMinor <= 0n) continue;
    needs.push({
      id: `pay-${v.invoice.id}`,
      kind: 'pay',
      title: `Pay ${formatMoney(v.state.dueMinor, v.invoice.currency)}`,
      detail: `${v.invoice.number} · ${v.state.status === 'overdue' ? v.state.statusText : `due ${formatDate(v.invoice.dueOn, { year: false })}`}`,
      href: `${base}/payments/${v.invoice.id}`,
    });
  }
  const threads = await asContact(pc, async (tx) =>
    Promise.all(projects.map(async (p) => ({ id: p.id, list: await projectMessages(tx, p.id) }))),
  );
  const latest = [
    ...views.flatMap((v) =>
      v.gateHistory.map((g) => ({
        id: `g-${v.id}-${g.at}`,
        who: 'You',
        text: g.decision === 'approved' ? `approved: ${g.title}` : `asked for changes: ${g.title}`,
        at: g.at,
      })),
    ),
    ...threads.flatMap((t) =>
      t.list
        .filter((m) => !m.fromClient)
        .map((m) => ({
          id: `m-${m.id}`,
          who: m.authorName,
          text: 'sent you a message',
          at: m.createdAt.toISOString(),
        })),
    ),
    ...invoices.flatMap((v) =>
      v.invoice.payments.map((pay) => ({
        id: `p-${pay.id}`,
        who: 'You',
        text: `paid ${formatMoney(pay.amountMinor, v.invoice.currency)} for ${v.invoice.number}`,
        at: `${pay.receivedOn}T12:00:00+05:30`,
      })),
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)
    .map((x) => ({ ...x, when: relativeTime(x.at, now) }));
  return {
    needs,
    projects: projects.map((p) => ({ id: p.id, name: p.name, ...progressOf(p) })),
    latest,
  };
}

// ---------- Messages and the account ----------

export async function sendPortalMessageFor(
  pc: PortalCtx,
  projectId: string,
  text: string,
): Promise<Outcome> {
  if (!(await ownProjects(pc)).some((p) => p.id === projectId))
    return { ok: false, error: 'This project isn’t yours.' };
  const result = await refusable(async () => {
    await asContact(pc, (tx) =>
      postMessage(
        tx,
        { workspaceId: pc.workspaceId, projectId, body: text, contactId: pc.contactId },
        pc.session.userId,
      ),
    );
  });
  if (!result.ok) return result;
  const event = await withService(pc.db, pc.workspaceId, (tx) =>
    messagePostedEvent(tx, projectId, pc.client.contact_name),
  );
  await deliver(pc.db, pc.workspaceId, [event]);
  return result;
}

export async function saveContactFor(
  pc: PortalCtx,
  input: { contactName: string; email: string | null; phone: string | null },
): Promise<Outcome> {
  return refusable(() =>
    asContact(pc, (tx) =>
      updateMyContact(tx, pc.contactId, {
        name: input.contactName,
        email: input.email ?? '',
        phone: input.phone,
      }),
    ),
  );
}

// ---------- The agency's side of the thread ----------

export async function projectMessagesFor(ctx: WorkspaceCtx, projectId: string) {
  const list = await asMember(ctx, (tx) => projectMessages(tx, projectId));
  return list.map((m) => messageOf(projectId, m));
}

/** A member's reply; the client sees it in the portal. */
export async function teamMessageFor(
  ctx: WorkspaceCtx,
  projectId: string,
  text: string,
): Promise<Outcome> {
  return refusable(async () => {
    await asMember(ctx, (tx) =>
      postMessage(tx, { workspaceId: ctx.workspaceId, projectId, body: text }, ctx.session.userId),
    );
  });
}
