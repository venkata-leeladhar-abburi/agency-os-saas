// Server only. The client portal: what one client sees and does. Every function takes the
// portal session (or, in example mode, the client's id) and only reads that client's projects
// and invoices. On the database the portal policies do the same (./db/portal.ts).
import { formatDate, formatMoney } from '@agency-os/core';
import type { PortalCtx } from '../server/portal';
import * as db from './db/portal';
import { notify } from './notifications';
import { ONLINE_METHODS, type OnlineMethod } from './pay-methods';
import { phaseNames } from './project-phases';
import { activity, newId, store } from './shared';
import type { Client, Invoice, Message, Project } from './types';
import { invoiceState, invoiceTotals, istDate, relativeTime } from './views';

export const EXAMPLE_PORTAL_CLIENT = 'acme';

/** Who is signed in to the portal; `db` is set on the database, null on example data. */
export type PortalSession = {
  agency: string;
  clientId: string;
  company: string;
  contact: string;
  firstVisit: boolean;
  db: PortalCtx | null;
};

/** The signed-in session, or a client's id for the example store (and its tests). */
type Who = string | PortalSession;
const idOf = (w: Who) => (typeof w === 'string' ? w : w.clientId);
const dbOf = (w: Who) => (typeof w === 'string' ? null : w.db);

/** What the project page shows of a project: never the budget or internal details. */
export type PortalProjectView = Pick<Project, 'id' | 'name' | 'lead' | 'gate' | 'gateHistory'>;

function client(clientId: string): Client | null {
  return store().clients.find((c) => c.id === clientId && c.portal !== 'not_invited') ?? null;
}

function ownProject(clientId: string, projectId: string): Project | null {
  return store().projects.find((p) => p.id === projectId && p.clientId === clientId) ?? null;
}

function ownInvoice(clientId: string, invoiceId: string): Invoice | null {
  // Drafts are the agency's; the client sees an invoice once it's issued.
  return (
    store().invoices.find((i) => i.id === invoiceId && i.clientId === clientId && i.number) ?? null
  );
}

/** The portal's frame: the agency's name and who is signed in. Marks the first visit. */
export async function portalSession(clientId: string): Promise<PortalSession | null> {
  const c = client(clientId);
  if (!c) return null;
  return {
    agency: store().settings.name,
    clientId: c.id,
    company: c.name,
    contact: c.contactName,
    firstVisit: c.portalVisitedAt === null,
    db: null,
  };
}

/** The same frame on the database: the first visit is the one that linked the login. */
export function portalSessionFromDb(pc: PortalCtx): PortalSession {
  return {
    agency: pc.client.workspace_name,
    clientId: pc.clientId,
    company: pc.client.client_name,
    contact: pc.client.contact_name,
    firstVisit: pc.claimed > 0,
    db: pc,
  };
}

/** The portal's look: the agency's logo, colour and whether its plan removes our branding. */
export async function portalBrand(w: PortalSession) {
  if (w.db)
    return { logoUrl: undefined, brandColour: w.db.client.brand_color, plan: w.db.client.plan };
  const s = store().settings;
  return { logoUrl: s.logo?.url, brandColour: s.brandColour, plan: s.plan };
}

/** The contact's own details for Account. */
export async function portalAccount(w: PortalSession) {
  if (w.db)
    return {
      name: w.db.client.contact_name,
      email: w.db.client.contact_email,
      phone: w.db.client.contact_phone,
    };
  const c = client(w.clientId);
  return { name: c?.contactName ?? w.contact, email: c?.email ?? null, phone: c?.phone ?? null };
}

/** Example data only: on the database, linking the login marks the first visit. */
export async function markPortalVisited(w: Who) {
  if (dbOf(w)) return;
  const c = client(idOf(w));
  if (c && !c.portalVisitedAt) {
    c.portalVisitedAt = new Date().toISOString();
    if (c.portal === 'invited') c.portal = 'active';
  }
}

function progress(p: Project) {
  const phases = phaseNames(p.template);
  return {
    phases,
    current: Math.min(p.phase, phases.length - 1),
    percent: Math.round((Math.min(p.phase, phases.length) / phases.length) * 100),
  };
}

function invoiceView(inv: Invoice, c: Client) {
  const totals = invoiceTotals(inv, c, store().settings);
  return { invoice: inv, totals, state: invoiceState(inv, totals.total.amountMinor) };
}

export type NeedsYou = {
  id: string;
  kind: 'approve' | 'pay';
  title: string;
  detail: string;
  href: string;
};

export async function portalHome(w: Who, slug: string) {
  const pc = dbOf(w);
  if (pc) return db.portalHomeFor(pc, slug);
  const clientId = idOf(w);
  const c = client(clientId);
  if (!c) return null;
  const base = `/p/${slug}`;
  const projects = store().projects.filter((p) => p.clientId === clientId);
  const needs: NeedsYou[] = [];
  for (const p of projects) {
    if (p.gate?.status === 'waiting')
      needs.push({
        id: `gate-${p.id}`,
        kind: 'approve',
        title: `Approve: ${p.gate.title}`,
        detail: `${p.name} · shared ${p.gate.sentAt ? formatDate(p.gate.sentAt, { year: false }) : ''} by ${p.lead}`,
        href: `${base}/projects/${p.id}`,
      });
  }
  const invoices = store()
    .invoices.filter((i) => i.clientId === clientId && i.number)
    .map((i) => invoiceView(i, c));
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
  const now = new Date();
  const latest = [
    ...projects.flatMap((p) =>
      p.gateHistory.map((g) => ({
        id: `g-${p.id}-${g.at}`,
        who: g.by === c.contactName ? 'You' : g.by,
        text: g.decision === 'approved' ? `approved: ${g.title}` : `asked for changes: ${g.title}`,
        at: g.at,
      })),
    ),
    ...store()
      .messages.filter((m) => projects.some((p) => p.id === m.projectId) && !m.fromClient)
      .map((m) => ({ id: `m-${m.id}`, who: m.who, text: 'sent you a message', at: m.at })),
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
    projects: projects.map((p) => ({ id: p.id, name: p.name, ...progress(p) })),
    latest,
  };
}

export async function portalProject(
  w: Who,
  projectId: string,
): Promise<{
  project: PortalProjectView;
  phases: string[];
  current: number;
  percent: number;
  phaseName: string;
  messages: Message[];
} | null> {
  const pc = dbOf(w);
  if (pc) return db.portalProjectFor(pc, projectId);
  const p = ownProject(idOf(w), projectId);
  if (!p) return null;
  const phases = phaseNames(p.template);
  return {
    project: p,
    ...progress(p),
    phaseName: phases[Math.min(p.phase, phases.length - 1)]!,
    messages: store()
      .messages.filter((m) => m.projectId === projectId)
      .sort((a, b) => a.at.localeCompare(b.at)),
  };
}

export type Outcome = { ok: true } | { ok: false; error: string };

/** The client approves the work waiting for them, or asks for changes with a note. */
export async function decideGate(
  w: Who,
  projectId: string,
  decision: 'approved' | 'changes',
  comment: string,
): Promise<Outcome> {
  const pc = dbOf(w);
  if (pc) return db.decideGateFor(pc, projectId, decision, comment);
  const clientId = idOf(w);
  const p = ownProject(clientId, projectId);
  const c = client(clientId);
  if (!p || !c) return { ok: false, error: 'This project isn’t yours.' };
  if (p.gate?.status !== 'waiting')
    return { ok: false, error: 'There’s nothing waiting for your approval.' };
  if (decision === 'changes' && !comment.trim())
    return { ok: false, error: 'Say what should change, so the team knows what to do.' };
  const phases = phaseNames(p.template);
  const title = p.gate.title;
  p.gateHistory.unshift({
    title,
    phase: phases[Math.min(p.phase, phases.length - 1)]!,
    decision,
    by: c.contactName,
    comment: comment.trim() || null,
    at: new Date().toISOString(),
  });
  if (decision === 'approved') {
    p.gate = null;
    p.phase = Math.min(p.phase + 1, phases.length - 1);
    p.activities.unshift(activity('signed', `approved “${title}”`, c.contactName));
  } else {
    p.gate = { ...p.gate, status: 'changes' };
    p.activities.unshift(
      activity('declined', `asked for changes to “${title}”: ${comment.trim()}`, c.contactName),
    );
  }
  notify(
    'gate_decided',
    decision === 'approved'
      ? `${c.contactName} approved: ${title}`
      : `${c.contactName} asked for changes: ${title}`,
    `${c.name} · ${p.name}`,
    `/projects/${p.id}`,
  );
  return { ok: true };
}

export async function portalInvoices(w: Who) {
  const pc = dbOf(w);
  if (pc) return db.portalInvoicesFor(pc);
  const clientId = idOf(w);
  const c = client(clientId);
  if (!c) return null;
  return store()
    .invoices.filter((i) => i.clientId === clientId && i.number)
    .map((i) => invoiceView(i, c))
    .sort((a, b) => (b.invoice.issuedOn ?? '').localeCompare(a.invoice.issuedOn ?? ''));
}

export async function portalInvoice(w: Who, invoiceId: string) {
  const pc = dbOf(w);
  if (pc) return db.portalInvoiceFor(pc, invoiceId);
  const clientId = idOf(w);
  const c = client(clientId);
  const inv = ownInvoice(clientId, invoiceId);
  if (!c || !inv) return null;
  return { ...invoiceView(inv, c), client: c, settings: store().settings };
}

/**
 * Example mode only: records the full amount as paid by UPI, so the portal's pay flow can be
 * tried. Real payments come from Razorpay (test keys needed) and its webhook.
 */
export async function examplePayment(
  clientId: string,
  invoiceId: string,
  method: OnlineMethod = 'upi',
): Promise<Outcome> {
  const c = client(clientId) ?? store().clients.find((x) => x.id === clientId);
  const inv = store().invoices.find(
    (i) => i.id === invoiceId && i.clientId === clientId && i.number,
  );
  if (!c || !inv) return { ok: false, error: 'This invoice isn’t yours.' };
  const { state } = invoiceView(inv, c);
  if (state.dueMinor <= 0n) return { ok: false, error: 'This invoice is already paid.' };
  inv.payments.push({
    id: newId('pay'),
    amountMinor: state.dueMinor,
    receivedOn: istDate(new Date()),
    method,
    reference: 'Example payment',
  });
  notify(
    'payment_received',
    `Payment received: ${formatMoney(state.dueMinor, inv.currency)} for ${inv.number}`,
    `${c.name} · ${ONLINE_METHODS.find((m) => m.value === method)!.label}`,
    `/invoices/${inv.id}`,
  );
  return { ok: true };
}

export async function sendMessage(
  projectId: string,
  from: { clientId: string } | { member: string },
  text: string,
): Promise<Outcome> {
  const body = text.trim();
  if (!body) return { ok: false, error: 'Write a message first.' };
  if (body.length > 4000) return { ok: false, error: 'Keep messages under 4,000 characters.' };
  const fromClient = 'clientId' in from;
  const project = fromClient
    ? ownProject(from.clientId, projectId)
    : (store().projects.find((p) => p.id === projectId) ?? null);
  if (!project) return { ok: false, error: 'This project isn’t yours.' };
  const c = store().clients.find((x) => x.id === project.clientId)!;
  const who = fromClient ? c.contactName : from.member;
  store().messages.push({
    id: newId('m'),
    projectId,
    who,
    fromClient,
    text: body,
    at: new Date().toISOString(),
  });
  if (fromClient)
    notify(
      'message',
      `${who} sent a message`,
      `${c.name} · ${project.name}`,
      `/projects/${project.id}`,
    );
  return { ok: true };
}

/** The client's message from the portal; the project team is told. */
export async function sendPortalMessage(w: Who, projectId: string, text: string) {
  const pc = dbOf(w);
  if (pc) return db.sendPortalMessageFor(pc, projectId, text);
  return sendMessage(projectId, { clientId: idOf(w) }, text);
}

export async function saveContact(
  w: Who,
  input: { contactName: string; email: string | null; phone: string | null },
): Promise<Outcome> {
  const pc = dbOf(w);
  if (pc) return db.saveContactFor(pc, input);
  const c = client(idOf(w));
  if (c) Object.assign(c, input);
  return { ok: true };
}
