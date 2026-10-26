// Server only. The data the workspace screens read and write.
// For now every function works on the example workspace (example-store.ts), so the screens and
// forms can be built and used before the database is reachable. Each one is swapped for its
// query in packages/db (withUser + the matching function) as the screens are wired up; the
// shapes the screens receive stay the same.
import { formatDate, formatInvoiceNumber, formatMoney, LEAD_SOURCE_LABELS } from '@agency-os/core';
import { MEMBERS } from '@agency-os/ui/example';
import type {
  ClientInput,
  InvoiceInput,
  LeadInput,
  PaymentInput,
  ProjectInput,
  SettingsInput,
} from '../forms';
import { activity, EXAMPLE_USER, newId, store } from './shared';
import type { Client, Invoice, Lead, Project, StageId } from './types';
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

export function exampleMode(): boolean {
  return process.env.EXAMPLE_MODE === 'true';
}

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
};

export const EXAMPLE_SLUG = 'one-stop';
export { EXAMPLE_USER } from './shared';

export function exampleWorkspace(): WorkspaceSummary {
  return {
    id: 'example',
    name: store().settings.name,
    slug: EXAMPLE_SLUG,
    role: 'owner',
    plan: 'Agency · Growth',
  };
}

/** The people a lead or project can be given to. */
export const PEOPLE = MEMBERS.map((m) => m.name);

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

export async function leads() {
  const now = new Date();
  const all = store().leads;
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

export async function getLead(id: string): Promise<Lead | null> {
  return store().leads.find((l) => l.id === id) ?? null;
}

function followUpAt(on: string | null): string | null {
  // Follow-ups are at 11:00 IST on the chosen day.
  return on ? new Date(`${on}T11:00:00+05:30`).toISOString() : null;
}

export async function createLead(input: LeadInput): Promise<string> {
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

export async function moveLead(id: string, stage: StageId) {
  const lead = await getLead(id);
  if (!lead || lead.stage === stage) return;
  lead.stage = stage;
  if (stage !== 'lost') lead.lostReason = null;
  lead.activities.unshift(activity('stage', `moved it to ${stageName(stage)}`));
}

export async function markLeadLost(id: string, reason: Lead['lostReason'], note: string) {
  const lead = await getLead(id);
  if (!lead) return;
  lead.stage = 'lost';
  lead.lostReason = reason;
  lead.followUpAt = null;
  lead.activities.unshift(activity('lost', note ? `marked it lost: ${note}` : 'marked it lost'));
}

export async function addLeadNote(id: string, note: string) {
  const lead = await getLead(id);
  lead?.activities.unshift(activity('note', note));
}

export async function setLeadFollowUp(id: string, on: string | null) {
  const lead = await getLead(id);
  if (lead) lead.followUpAt = followUpAt(on);
}

/** Won: the lead becomes a client (or links to the one it already is). Returns the client id. */
export async function winLead(id: string): Promise<string | null> {
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

export async function clients(): Promise<ClientRow[]> {
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

export async function clientOptions() {
  return store().clients.map((c) => ({
    id: c.id,
    name: c.name,
    currency: c.currency,
    country: c.country,
  }));
}

export async function getClient(id: string) {
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

export async function createClient(input: ClientInput): Promise<string> {
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

export async function inviteToPortal(id: string) {
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

function projectHealth(p: Project) {
  const late =
    p.gate?.status === 'waiting' && p.gate.sentAt
      ? Date.now() - new Date(p.gate.sentAt).getTime() > 24 * 60 * 60 * 1000
      : false;
  const overBudget = budgetUsed(p.usedMinor, p.budgetMinor) >= 90;
  if (istDate(new Date()) > p.dueOn) return 'Late' as const;
  return late || overBudget ? ('At risk' as const) : ('On track' as const);
}

export async function projects(): Promise<ProjectRow[]> {
  return store().projects.map((p) => {
    const client = store().clients.find((c) => c.id === p.clientId);
    const phases = p.template === 'seven_phases' ? 7 : 1;
    return {
      id: p.id,
      name: p.name,
      client: client?.name ?? '—',
      clientId: p.clientId,
      lead: p.lead,
      phase: p.phase,
      health: projectHealth(p),
      nextGate: p.gate ? p.gate.title : '—',
      due: formatDate(p.dueOn),
      progress: Math.round((p.phase / phases) * 100),
    };
  });
}

export async function getProject(id: string) {
  const project = store().projects.find((p) => p.id === id);
  if (!project) return null;
  const client = store().clients.find((c) => c.id === project.clientId)!;
  return { project, client, health: projectHealth(project) };
}

export async function createProject(input: ProjectInput): Promise<string> {
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

export async function requestGate(id: string, title: string) {
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
};

function invoiceView(inv: Invoice) {
  const client = store().clients.find((c) => c.id === inv.clientId)!;
  const totals = invoiceTotals(inv, client, store().settings);
  const state = invoiceState(inv, totals.total.amountMinor);
  return { invoice: inv, client, totals, state };
}

export async function invoices(): Promise<InvoiceRow[]> {
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
    };
  });
}

export async function getInvoice(id: string) {
  const inv = store().invoices.find((i) => i.id === id);
  if (!inv) return null;
  return { ...invoiceView(inv), settings: store().settings };
}

/** The number the next issued invoice gets, for the editor's subtitle. */
export async function nextInvoiceNumber(): Promise<string> {
  const s = store();
  return formatInvoiceNumber(s.settings.invoicePrefix, new Date(), s.invoiceSequence + 1);
}

function issueNumber(): string {
  const s = store();
  s.invoiceSequence += 1;
  return formatInvoiceNumber(s.settings.invoicePrefix, new Date(), s.invoiceSequence);
}

export async function createInvoice(input: InvoiceInput): Promise<string> {
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
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function issueInvoice(id: string) {
  const inv = store().invoices.find((i) => i.id === id);
  if (!inv || inv.number) return;
  inv.number = issueNumber();
  inv.issuedOn = istDate(new Date());
}

export async function recordPayment(id: string, input: PaymentInput) {
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

export async function settings() {
  return store().settings;
}

export async function saveSettings(input: SettingsInput) {
  Object.assign(store().settings, input);
}

export async function members() {
  return MEMBERS;
}

export async function dashboard() {
  const due = store()
    .invoices.map(invoiceView)
    .filter((v) => v.invoice.number && v.invoice.currency === 'INR');
  const sum = (list: typeof due) => list.reduce((t, v) => t + v.state.dueMinor, 0n);
  const pending = due.filter(
    (v) => v.state.status === 'due' || v.state.status === 'partially_paid',
  );
  const overdue = due.filter((v) => v.state.status === 'overdue');
  const paidThisMonth = store()
    .invoices.flatMap((i) => (i.currency === 'INR' ? i.payments : []))
    .filter((p) => p.receivedOn.slice(0, 7) === istDate(new Date()).slice(0, 7))
    .reduce((t, p) => t + p.amountMinor, 0n);
  const open = store().leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
  const decided = store().leads.filter((l) => l.stage === 'won' || l.stage === 'lost');
  const winRate = decided.length
    ? Math.round((decided.filter((l) => l.stage === 'won').length / decided.length) * 100)
    : null;
  const atRisk = (await projects()).filter((p) => p.health !== 'On track');
  return {
    metrics: {
      revenue: {
        label: `Received · ${new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date())}`,
        value: formatMoney(paidThisMonth, 'INR', { decimals: 0 }),
        note: 'Payments in rupees',
      },
      pending: {
        label: 'Pending',
        value: formatMoney(sum(pending), 'INR', { decimals: 0 }),
        note: `${pending.length} ${pending.length === 1 ? 'invoice' : 'invoices'}`,
      },
      overdue: {
        label: 'Overdue',
        value: formatMoney(sum(overdue), 'INR', { decimals: 0 }),
        note: `${overdue.length} ${overdue.length === 1 ? 'invoice' : 'invoices'}`,
      },
      pipeline: {
        label: 'Pipeline value',
        value: formatMoney(
          open.reduce((t, l) => t + l.valueMinor, 0n),
          'INR',
          { compact: true },
        ),
        note: winRate === null ? 'No decided leads yet' : `Win rate ${winRate}%`,
      },
    },
    atRisk: atRisk.map((p) => ({
      id: p.id,
      client: p.client,
      project: p.name,
      why: p.nextGate !== '—' && p.health === 'At risk' ? `${p.nextGate}: waiting` : p.health,
      progress: p.progress,
      tone: p.health === 'Late' ? ('danger' as const) : ('default' as const),
    })),
    teamLoad: PEOPLE.map((name) => ({
      name,
      open: store().tasks.filter((t) => t.assignee === name && t.status !== 'done').length,
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

export async function projectMessages(projectId: string) {
  return store()
    .messages.filter((m) => m.projectId === projectId)
    .sort((a, b) => a.at.localeCompare(b.at));
}
