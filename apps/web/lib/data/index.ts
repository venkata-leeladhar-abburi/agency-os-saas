// Server only. The data the workspace screens read and write.
// For now every function works on the example workspace (example-store.ts), so the screens and
// forms can be built and used before the database is reachable. Each one is swapped for its
// query in packages/db (withUser + the matching function) as the screens are wired up; the
// shapes the screens receive stay the same.
import { randomBytes } from 'node:crypto';
import {
  formatDate,
  formatInvoiceNumber,
  formatMoney,
  LEAD_SOURCE_LABELS,
  PLAN_DETAILS,
  moneySummary,
  reminderSchedule,
  reminderStates,
  winRate,
} from '@agency-os/core';
import type {
  ClientInput,
  InvoiceInput,
  LeadInput,
  PaymentInput,
  ProjectInput,
  SettingsInput,
} from '../forms';
import { ctxFor } from './ctx';
import * as dbInvoices from './db/invoices';
import * as dbPeople from './db/people';
import * as dbWork from './db/work';
import { limitInfo, needsUpgrade, type LimitInfo } from './plan';
import { activity, EXAMPLE_USER, newId, store } from './shared';
import type { Client, Invoice, Lead, Project, StageId, WorkspaceSettings } from './types';
import {
  budgetUsed,
  followUp,
  invoiceState,
  invoiceTotals,
  istDate,
  leadBoard,
  leadTitle,
  stageName,
} from './views';

export { exampleMode } from './ctx';

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
};

export const EXAMPLE_SLUG = 'one-stop';
export { EXAMPLE_USER } from './shared';
export { people } from './team';

export function exampleWorkspace(): WorkspaceSummary {
  return {
    id: 'example',
    name: store().settings.name,
    slug: EXAMPLE_SLUG,
    role: 'owner',
    plan: PLAN_DETAILS[store().settings.plan].name,
  };
}

// ---------- Leads ----------

export type LeadRow = {
  id: string;
  name: string;
  contact: string;
  stage: 'New' | 'Contacted' | 'Proposal' | 'Won' | 'Lost';
  valueMinor: bigint;
  source: string;
  owner: string;
  followUp: string;
  overdue?: boolean;
};

export async function leads(slug?: string) {
  const now = new Date();
  const ctx = await ctxFor(slug);
  const all = ctx ? await dbPeople.leadList(ctx) : store().leads;
  const rows: LeadRow[] = all.map((l) => {
    const f = followUp(l.followUpAt, now);
    return {
      id: l.id,
      name: leadTitle(l),
      contact: l.company ? l.name : (l.email ?? l.phone ?? ''),
      stage: stageName(l.stage) as LeadRow['stage'],
      valueMinor: l.valueMinor,
      source: LEAD_SOURCE_LABELS[l.source],
      owner: l.owner,
      followUp: f?.text ?? '—',
      overdue: f?.overdue,
    };
  });
  return { rows, board: leadBoard(all, now) };
}

export async function getLead(id: string, slug?: string): Promise<Lead | null> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.leadDetail(ctx, id);
  return store().leads.find((l) => l.id === id) ?? null;
}

function followUpAt(on: string | null): string | null {
  // Follow-ups are at 11:00 IST on the chosen day.
  return on ? new Date(`${on}T11:00:00+05:30`).toISOString() : null;
}

export async function createLead(input: LeadInput, slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.createLeadFor(ctx, input);
  const id = newId('lead');
  store().leads.unshift({
    id,
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    stage: 'new',
    valueMinor: input.valueMinor,
    source: input.source,
    service: input.service,
    owner: EXAMPLE_USER.name,
    followUpAt: followUpAt(input.followUpOn),
    notes: input.notes,
    lostReason: null,
    clientId: null,
    createdAt: new Date().toISOString(),
    activities: [activity('created', 'added the lead')],
  });
  return id;
}

export async function moveLead(id: string, stage: StageId, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.moveLeadFor(ctx, id, stage);
  const lead = await getLead(id);
  if (!lead || lead.stage === stage) return;
  lead.stage = stage;
  if (stage !== 'lost') lead.lostReason = null;
  lead.activities.unshift(activity('stage', `moved it to ${stageName(stage)}`));
}

export async function markLeadLost(
  id: string,
  reason: NonNullable<Lead['lostReason']>,
  note: string,
  slug?: string,
) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.markLeadLostFor(ctx, id, reason, note);
  const lead = await getLead(id);
  if (!lead) return;
  lead.stage = 'lost';
  lead.lostReason = reason;
  lead.followUpAt = null;
  lead.activities.unshift(activity('lost', note ? `marked it lost: ${note}` : 'marked it lost'));
}

export async function addLeadNote(id: string, note: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.addLeadNoteFor(ctx, id, note);
  const lead = await getLead(id);
  lead?.activities.unshift(activity('note', note));
}

export async function setLeadFollowUp(id: string, on: string | null, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.setLeadFollowUpFor(ctx, id, on);
  const lead = await getLead(id);
  if (lead) lead.followUpAt = followUpAt(on);
}

/** Won: the lead becomes a client (or links to the one it already is). Returns the client id. */
export async function winLead(id: string, slug?: string): Promise<string | null> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.winLeadFor(ctx, id);
  const lead = await getLead(id);
  if (!lead) return null;
  if (!lead.clientId) {
    const clientId = await createClient({
      name: leadTitle(lead),
      contactName: lead.name,
      email: lead.email,
      phone: lead.phone,
      city: null,
      country: 'IN',
      currency: 'INR',
      gstin: null,
      stateCode: null,
      notes: lead.notes,
    });
    lead.clientId = clientId;
  }
  lead.stage = 'won';
  lead.followUpAt = null;
  lead.activities.unshift(activity('won', 'marked it won and made it a client'));
  return lead.clientId;
}

// ---------- Clients ----------

export type ClientRow = {
  id: string;
  name: string;
  contact: string;
  city: string;
  projects: number;
  billedMinor: bigint;
  outstandingMinor: bigint;
  currency: string;
  portal: 'Active' | 'Invited' | 'Not invited';
};

const PORTAL_LABEL = { active: 'Active', invited: 'Invited', not_invited: 'Not invited' } as const;

function clientMoney(client: Client) {
  let billed = 0n;
  let outstanding = 0n;
  let quoted = 0n;
  for (const inv of store().invoices.filter((i) => i.clientId === client.id)) {
    const totals = invoiceTotals(inv, client, store().settings);
    if (!inv.number) {
      quoted += totals.total.amountMinor;
      continue;
    }
    billed += totals.total.amountMinor;
    outstanding += invoiceState(inv, totals.total.amountMinor).dueMinor;
  }
  return { billed, outstanding, drafts: quoted };
}

export async function clients(slug?: string): Promise<ClientRow[]> {
  const ctx = await ctxFor(slug);
  if (ctx)
    return (await dbPeople.clientList(ctx)).map(({ client: c, money: m, projects }) => ({
      id: c.id,
      name: c.name,
      contact: c.contactName,
      city: c.city ?? '—',
      projects,
      billedMinor: m.billed,
      outstandingMinor: m.outstanding,
      currency: c.currency,
      portal: PORTAL_LABEL[c.portal],
    }));
  return store().clients.map((c) => {
    const m = clientMoney(c);
    return {
      id: c.id,
      name: c.name,
      contact: c.contactName,
      city: c.city ?? '—',
      projects: store().projects.filter((p) => p.clientId === c.id).length,
      billedMinor: m.billed,
      outstandingMinor: m.outstanding,
      currency: c.currency,
      portal: PORTAL_LABEL[c.portal],
    };
  });
}

async function exampleClientOptions() {
  return store().clients.map((c) => ({
    id: c.id,
    name: c.name,
    currency: c.currency,
    country: c.country,
    stateCode: c.stateCode,
  }));
}

export async function getClient(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) {
    const found = await dbPeople.clientDetail(ctx, id);
    if (!found) return null;
    return {
      ...found,
      projects: (await projects(slug)).filter((p) => p.clientId === id),
      invoices: (await dbInvoices.invoiceRows(ctx)).filter((i) => i.clientId === id),
    };
  }
  const client = store().clients.find((c) => c.id === id);
  if (!client) return null;
  const m = clientMoney(client);
  return {
    client,
    money: m,
    projects: (await projects()).filter((p) => p.clientId === id),
    invoices: (await invoices()).filter((i) => i.clientId === id),
  };
}

export async function createClient(input: ClientInput, slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.createClientFor(ctx, input);
  const id = newId('client');
  store().clients.unshift({
    id,
    ...input,
    portal: 'not_invited',
    portalVisitedAt: null,
    createdAt: new Date().toISOString(),
    activities: [activity('created', 'added the client')],
  });
  return id;
}

export async function inviteToPortal(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbPeople.inviteToPortalFor(ctx, id);
  const client = store().clients.find((c) => c.id === id);
  if (client && client.portal === 'not_invited') client.portal = 'invited';
}

// ---------- Projects ----------

export type ProjectRow = {
  id: string;
  name: string;
  client: string;
  clientId: string;
  lead: string;
  phase: number;
  health: 'On track' | 'At risk' | 'Late';
  nextGate: string;
  due: string;
  progress: number;
};

/** Why a project needs attention (prd-mvp.md E1.9: overdue gates or tasks), most urgent first. */
export function projectRisks(p: Project, now = new Date(), lateTasks?: number): string[] {
  const todayOn = istDate(now);
  const reasons: string[] = [];
  if (todayOn > p.dueOn)
    reasons.push(`Past its due date (${formatDate(p.dueOn, { year: false })})`);
  if (p.gate?.status === 'waiting' && p.gate.sentAt) {
    const days = Math.floor((now.getTime() - new Date(p.gate.sentAt).getTime()) / 86_400_000);
    if (days >= 1) reasons.push(`${p.gate.title}: waiting ${days} ${days === 1 ? 'day' : 'days'}`);
  }
  const late =
    lateTasks ??
    store().tasks.filter(
      (t) => t.projectId === p.id && t.status !== 'done' && t.dueOn && t.dueOn < todayOn,
    ).length;
  if (late) reasons.push(`${late} ${late === 1 ? 'task' : 'tasks'} overdue`);
  const used = budgetUsed(p.usedMinor, p.budgetMinor);
  if (used >= 90) reasons.push(`Budget ${used}% used`);
  return reasons;
}

function projectHealth(p: Project, now = new Date(), lateTasks?: number) {
  if (istDate(now) > p.dueOn) return 'Late' as const;
  return projectRisks(p, now, lateTasks).length ? ('At risk' as const) : ('On track' as const);
}

function projectRow(p: Project, client: string, health: ProjectRow['health']): ProjectRow {
  const phases = p.template === 'seven_phases' ? 7 : 1;
  return {
    id: p.id,
    name: p.name,
    client,
    clientId: p.clientId,
    lead: p.lead,
    phase: p.phase,
    health,
    nextGate: p.gate ? p.gate.title : '—',
    due: formatDate(p.dueOn),
    progress: Math.round((p.phase / phases) * 100),
  };
}

export async function projects(slug?: string): Promise<ProjectRow[]> {
  const ctx = await ctxFor(slug);
  if (ctx) {
    const now = new Date();
    return (await dbWork.projectList(ctx, now)).map(({ project, client, late }) =>
      projectRow(project, client.name, projectHealth(project, now, late)),
    );
  }
  return store().projects.map((p) => {
    const client = store().clients.find((c) => c.id === p.clientId);
    return projectRow(p, client?.name ?? '—', projectHealth(p));
  });
}

export async function getProject(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) {
    const now = new Date();
    const found = await dbWork.projectDetail(ctx, id, now);
    return found
      ? {
          project: found.project,
          client: found.client,
          health: projectHealth(found.project, now, found.late),
        }
      : null;
  }
  const project = store().projects.find((p) => p.id === id);
  if (!project) return null;
  const client = store().clients.find((c) => c.id === project.clientId)!;
  return { project, client, health: projectHealth(project) };
}

export async function createProject(input: ProjectInput, slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.createProjectFor(ctx, input);
  const id = newId('project');
  store().projects.unshift({
    id,
    name: input.name,
    clientId: input.clientId,
    lead: input.lead,
    template: input.template,
    phase: 0,
    budgetMinor: input.budgetMinor,
    usedMinor: 0n,
    startOn: input.startOn,
    dueOn: input.dueOn,
    gate: null,
    gateHistory: [],
    activities: [activity('created', 'started the project')],
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function requestGate(id: string, title: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbWork.requestGateFor(ctx, id, title);
  const found = await getProject(id);
  if (!found) return;
  found.project.gate = {
    title,
    status: 'waiting',
    approver: found.client.contactName,
    sentAt: new Date().toISOString(),
  };
  found.project.activities.unshift(
    activity('stage', `asked ${found.client.contactName} to approve “${title}”`),
  );
}

// ---------- Invoices ----------

export type InvoiceRow = {
  id: string;
  number: string;
  client: string;
  clientId: string;
  amount: string;
  issued: string;
  due: string;
  status: 'draft' | 'due' | 'overdue' | 'paid' | 'partially_paid';
  statusText: string;
  /** A payment came in this calendar month (IST): the dashboard's "Received". */
  paidThisMonth: boolean;
};

function invoiceView(inv: Invoice) {
  const client = store().clients.find((c) => c.id === inv.clientId)!;
  const totals = invoiceTotals(inv, client, store().settings);
  const state = invoiceState(inv, totals.total.amountMinor);
  return { invoice: inv, client, totals, state };
}

async function exampleInvoices(): Promise<InvoiceRow[]> {
  return store().invoices.map((inv) => {
    const { client, totals, state } = invoiceView(inv);
    return {
      id: inv.id,
      number: inv.number ?? 'Draft',
      client: client.name,
      clientId: client.id,
      amount: formatMoney(totals.total.amountMinor, inv.currency),
      issued: inv.issuedOn ? formatDate(inv.issuedOn, { year: false }) : '—',
      due: formatDate(inv.dueOn, { year: false }),
      status: state.status,
      statusText: state.statusText,
      paidThisMonth: inv.payments.some(
        (p) => p.receivedOn.slice(0, 7) === istDate(new Date()).slice(0, 7),
      ),
    };
  });
}

async function exampleGetInvoice(id: string) {
  const inv = store().invoices.find((i) => i.id === id);
  if (!inv) return null;
  const view = invoiceView(inv);
  return {
    ...view,
    settings: store().settings,
    reminders: invoiceReminders(inv, view.state.status === 'paid'),
  };
}

/** The number the next issued invoice gets, for the editor's subtitle. */
async function exampleNextInvoiceNumber(): Promise<string> {
  const s = store();
  return formatInvoiceNumber(s.settings.invoicePrefix, new Date(), s.invoiceSequence + 1);
}

function issueNumber(): string {
  const s = store();
  s.invoiceSequence += 1;
  return formatInvoiceNumber(s.settings.invoicePrefix, new Date(), s.invoiceSequence);
}

async function exampleCreateInvoice(input: InvoiceInput): Promise<string> {
  const id = newId('inv');
  const today = istDate(new Date());
  store().invoices.unshift({
    id,
    number: input.issue ? issueNumber() : null,
    clientId: input.clientId,
    currency: input.currency,
    issuedOn: input.issue ? today : null,
    dueOn: input.dueOn,
    lines: input.lines,
    exchangeRate: input.exchangeRate,
    payments: [],
    reminders: input.reminders,
    remindersSent: [],
    payToken: randomBytes(16).toString('base64url'),
    createdAt: new Date().toISOString(),
  });
  return id;
}

/** Where each reminder for an issued invoice stands today; null for drafts. */
export function invoiceReminders(inv: Invoice, paid: boolean, now = new Date()) {
  if (!inv.issuedOn) return null;
  return reminderStates(
    reminderSchedule({ issuedOn: inv.issuedOn, dueOn: inv.dueOn }),
    inv.remindersSent,
    { today: istDate(now), paid, enabled: inv.reminders },
  );
}

/** A new pay link: the old one stops working at once (for a link sent to the wrong person). */
async function exampleNewPayLink(id: string): Promise<string | null> {
  const inv = store().invoices.find((i) => i.id === id);
  if (!inv?.number) return null;
  inv.payToken = randomBytes(16).toString('base64url');
  return inv.number;
}

async function exampleSetInvoiceReminders(id: string, on: boolean) {
  const inv = store().invoices.find((i) => i.id === id);
  if (inv) inv.reminders = on;
}

async function exampleIssueInvoice(id: string) {
  const inv = store().invoices.find((i) => i.id === id);
  if (!inv || inv.number) return;
  inv.number = issueNumber();
  inv.issuedOn = istDate(new Date());
}

async function exampleRecordPayment(id: string, input: PaymentInput) {
  const inv = store().invoices.find((i) => i.id === id);
  inv?.payments.push({
    id: newId('pay'),
    amountMinor: input.amountMinor,
    receivedOn: input.receivedOn,
    method: input.method,
    reference: input.reference,
  });
}

// ---------- Workspace ----------

async function exampleSettings() {
  return store().settings;
}

export async function saveSettings(input: SettingsInput, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) await dbInvoices.saveSettingsFor(ctx, input);
  else Object.assign(store().settings, input);
}

export async function saveBrandColour(colour: string | null, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) await dbInvoices.saveBrandColourFor(ctx, colour);
  else store().settings.brandColour = colour;
}

export async function saveLogo(logo: WorkspaceSettings['logo']) {
  store().settings.logo = logo;
}

/** When a lead was won or lost: its won/lost activity, else its latest activity. */
function decidedAt(l: Lead): string {
  return (
    l.activities.find((a) => a.kind === 'won' || a.kind === 'lost')?.at ??
    l.activities[0]?.at ??
    l.createdAt
  );
}

export async function dashboard(now = new Date()) {
  const s = store();
  const views = s.invoices.map(invoiceView);
  const month = istDate(now).slice(0, 7);
  const money = moneySummary(
    views.map((v) => ({
      currency: v.invoice.currency,
      exchangeRate: v.invoice.exchangeRate,
      status: v.state.status,
      dueMinor: v.state.dueMinor,
      payments: v.invoice.payments,
    })),
    { month, base: 'INR' },
  );
  const inr = (m: bigint) => formatMoney(m, 'INR', { decimals: 0 });
  const invoicesNote = (n: number) => `${n} ${n === 1 ? 'invoice' : 'invoices'}`;
  const open = s.leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
  const rate = winRate(
    s.leads
      .filter((l) => l.stage === 'won' || l.stage === 'lost')
      .map((l) => ({ decidedAt: decidedAt(l), won: l.stage === 'won' })),
    { now },
  );
  const atRisk = s.projects
    .map((p) => ({ p, reasons: projectRisks(p, now) }))
    .filter((x) => x.reasons.length);
  const hasMoney = views.some((v) => v.invoice.number) || s.quotes.length > 0;
  return {
    /** Nothing billed or quoted yet: the first-week empty state instead of zeros. */
    empty: !hasMoney && open.length === 0,
    metrics: {
      revenue: {
        label: `Received · ${new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' }).format(now)}`,
        value: inr(money.received.minor),
        note: `${money.received.count} ${money.received.count === 1 ? 'payment' : 'payments'}`,
      },
      pending: {
        label: 'Pending',
        value: inr(money.pending.minor),
        note: invoicesNote(money.pending.count),
      },
      overdue: {
        label: 'Overdue',
        value: inr(money.overdue.minor),
        note: invoicesNote(money.overdue.count),
      },
      pipeline: {
        label: 'Pipeline value',
        value: formatMoney(
          open.reduce((t, l) => t + l.valueMinor, 0n),
          'INR',
          { compact: true },
        ),
        note: rate ? `Win rate ${rate.percent}% (90 days)` : 'No leads won or lost in 90 days',
      },
    },
    /** Invoices in another currency without a rate, left out of the money figures. */
    unconverted: money.unconverted,
    atRisk: atRisk.map(({ p, reasons }) => ({
      id: p.id,
      client: s.clients.find((c) => c.id === p.clientId)?.name ?? '—',
      project: p.name,
      why: reasons.join(' · '),
      progress: Math.round((p.phase / (p.template === 'seven_phases' ? 7 : 1)) * 100),
      tone: istDate(now) > p.dueOn ? ('danger' as const) : ('default' as const),
    })),
    teamLoad: s.members.map(({ id, name }) => ({
      id,
      name,
      open: s.tasks.filter((t) => t.assignee === name && t.status !== 'done').length,
    })),
  };
}

export type TodayItem = {
  id: string;
  group: 'Follow-ups' | 'Tasks' | 'Approvals waiting' | 'Invoices';
  title: string;
  meta: string;
  href: string;
  overdue: boolean;
};

/** What needs doing today: follow-ups, my tasks, approvals waiting on clients, invoices due or late. */
export async function today(slug: string): Promise<TodayItem[]> {
  const now = new Date();
  const todayOn = istDate(now);
  const items: TodayItem[] = [];
  for (const l of store().leads) {
    if (!l.followUpAt || istDate(l.followUpAt) > todayOn) continue;
    const f = followUp(l.followUpAt, now)!;
    items.push({
      id: `lead-${l.id}`,
      group: 'Follow-ups',
      title: `Follow up ${leadTitle(l)}`,
      meta: `${stageName(l.stage)} · ${f.text}`,
      href: `/w/${slug}/leads/${l.id}`,
      overdue: f.overdue,
    });
  }
  for (const t of store().tasks) {
    if (t.assignee !== EXAMPLE_USER.name || t.status === 'done' || !t.dueOn || t.dueOn > todayOn)
      continue;
    const project = store().projects.find((p) => p.id === t.projectId);
    items.push({
      id: `task-${t.id}`,
      group: 'Tasks',
      title: t.title,
      meta: `${project?.name ?? ''} · ${t.dueOn < todayOn ? `was due ${formatDate(t.dueOn, { year: false })}` : 'due today'}`,
      href: `/w/${slug}/tasks/${t.id}`,
      overdue: t.dueOn < todayOn,
    });
  }
  for (const p of store().projects) {
    if (p.gate?.status !== 'waiting') continue;
    const client = store().clients.find((c) => c.id === p.clientId);
    items.push({
      id: `gate-${p.id}`,
      group: 'Approvals waiting',
      title: p.gate.title,
      meta: `${client?.name ?? ''} · sent ${p.gate.sentAt ? formatDate(p.gate.sentAt, { year: false }) : ''}`,
      href: `/w/${slug}/projects/${p.id}`,
      overdue: false,
    });
  }
  for (const v of store().invoices.map(invoiceView)) {
    if (v.state.status !== 'overdue' && !(v.state.status === 'due' && v.invoice.dueOn <= todayOn))
      continue;
    items.push({
      id: `inv-${v.invoice.id}`,
      group: 'Invoices',
      title: `${v.invoice.number} · ${formatMoney(v.state.dueMinor, v.invoice.currency)}`,
      meta: `${v.client.name} · ${v.state.statusText}`,
      href: `/w/${slug}/invoices/${v.invoice.id}`,
      overdue: v.state.status === 'overdue',
    });
  }
  return items;
}

/** Example mode only for now: messages need their own table, which comes with the portal. */
export async function projectMessages(projectId: string) {
  return store()
    .messages.filter((m) => m.projectId === projectId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

// ---------- Example data or the database ----------
// Each function below serves the example store when EXAMPLE_MODE=true and the database
// otherwise, as the signed-in member of the workspace in the URL (RLS applies).

/** The workspace context for database mode; example mode needs none. */

export async function clientOptions(slug?: string) {
  const ctx = await ctxFor(slug);
  if (!ctx) return exampleClientOptions();
  return dbInvoices.clientChoices(ctx);
}

export async function invoices(slug?: string): Promise<InvoiceRow[]> {
  const ctx = await ctxFor(slug);
  return ctx ? dbInvoices.invoiceRows(ctx) : exampleInvoices();
}

export async function getInvoice(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  return ctx ? dbInvoices.invoiceDetail(ctx, id) : exampleGetInvoice(id);
}

export async function nextInvoiceNumber(slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  return ctx ? dbInvoices.nextNumber(ctx) : exampleNextInvoiceNumber();
}

export async function createInvoice(input: InvoiceInput, slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  return ctx ? dbInvoices.createInvoiceFor(ctx, input) : exampleCreateInvoice(input);
}

export async function issueInvoice(id: string, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) await dbInvoices.issueInvoiceFor(ctx, id);
  else await exampleIssueInvoice(id);
}

export async function recordPayment(id: string, input: PaymentInput, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) await dbInvoices.recordPaymentFor(ctx, id, input);
  else await exampleRecordPayment(id, input);
}

export async function setInvoiceReminders(id: string, on: boolean, slug?: string) {
  const ctx = await ctxFor(slug);
  if (ctx) await dbInvoices.setRemindersFor(ctx, id, on);
  else await exampleSetInvoiceReminders(id, on);
}

/** A new pay link; returns the invoice number (example mode) for the audit line. */
export async function newPayLink(id: string, slug?: string): Promise<string | null> {
  const ctx = await ctxFor(slug);
  if (!ctx) return exampleNewPayLink(id);
  await dbInvoices.newPayLinkFor(ctx, id);
  // The database writes its own audit entry.
  return null;
}

export async function settings(slug?: string) {
  const ctx = await ctxFor(slug);
  return ctx ? dbInvoices.settingsFor(ctx) : exampleSettings();
}

/** Before adding: null when the plan has room, else what the limit dialog shows. */
export async function planLimit(
  slug: string,
  resource:
    | 'invoices_per_month'
    | 'open_leads'
    | 'portal_clients'
    | 'quotes_per_month'
    | 'proposals_per_month',
): Promise<LimitInfo | null> {
  const ctx = await ctxFor(slug);
  if (!ctx) return needsUpgrade(resource);
  const check = await dbInvoices.planRoom(ctx, resource);
  return check.allowed ? null : limitInfo(resource, check, ctx.plan);
}
