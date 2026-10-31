// Server only. Data export: every record as CSV, or everything as JSON (PRD E0.5). The same
// CSV columns come from the example store or, once signed in, from the database.
import {
  minorDigits,
  LEAD_SOURCE_LABELS,
  ROLE_LABELS,
  toCsv,
  toDecimalString,
  type InvoiceTotals,
} from '@agency-os/core';
import { ctxFor } from './ctx';
import * as dbExport from './db/export';
import { store } from './shared';
import {
  STAGES,
  TASK_STATUSES,
  type Client,
  type Invoice,
  type Lead,
  type Member,
  type Project,
  type Quote,
  type Task,
} from './types';
import { invoiceState, invoiceTotals, quoteTotals, type InvoiceState } from './views';

export const EXPORTS = {
  leads: 'Leads',
  clients: 'Clients',
  projects: 'Projects',
  tasks: 'Tasks',
  quotes: 'Quotes',
  invoices: 'Invoices',
  payments: 'Payments',
  members: 'Team',
} as const;
export type ExportKind = keyof typeof EXPORTS;

/** What the CSV files are made from, whichever store it comes from. */
export type ExportSource = {
  leads: Lead[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  quotes: { quote: Quote; totals: InvoiceTotals }[];
  invoices: { invoice: Invoice; client: Client; totals: InvoiceTotals; state: InvoiceState }[];
  members: Member[];
};

function exampleSource(): ExportSource {
  const s = store();
  return {
    leads: s.leads,
    clients: s.clients,
    projects: s.projects,
    tasks: s.tasks,
    quotes: s.quotes.map((quote) => ({ quote, totals: quoteTotals(quote, s.settings) })),
    invoices: s.invoices.map((invoice) => {
      const client = s.clients.find((c) => c.id === invoice.clientId)!;
      const totals = invoiceTotals(invoice, client, s.settings);
      return { invoice, client, totals, state: invoiceState(invoice, totals.total.amountMinor) };
    }),
    members: s.members,
  };
}

/** The example store, or the database (only for roles that may export; null otherwise). */
async function sourceFor(slug?: string): Promise<ExportSource | null> {
  const ctx = await ctxFor(slug);
  return ctx ? dbExport.exportSource(ctx) : exampleSource();
}

const amount = (minor: bigint, currency: string) => toDecimalString(minor, minorDigits(currency));

function csvOf(kind: ExportKind, src: ExportSource): string {
  const client = (id: string | null) => src.clients.find((c) => c.id === id)?.name ?? '';
  switch (kind) {
    case 'leads':
      return toCsv(
        src.leads.map((l) => ({
          Name: l.name,
          Company: l.company ?? '',
          Email: l.email ?? '',
          Phone: l.phone ?? '',
          Stage: STAGES.find((x) => x.id === l.stage)!.name,
          Value: amount(l.valueMinor, 'INR'),
          Source: LEAD_SOURCE_LABELS[l.source],
          Service: l.service,
          Owner: l.owner,
          Created: l.createdAt,
          Example: l.example ? 'Yes' : '',
        })),
      );
    case 'clients':
      return toCsv(
        src.clients.map((c) => ({
          Name: c.name,
          Contact: c.contactName,
          Email: c.email ?? '',
          Phone: c.phone ?? '',
          City: c.city ?? '',
          Country: c.country,
          Currency: c.currency,
          GSTIN: c.gstin ?? '',
          'State code': c.stateCode ?? '',
          Portal: c.portal,
          Example: c.example ? 'Yes' : '',
        })),
      );
    case 'projects':
      return toCsv(
        src.projects.map((p) => ({
          Name: p.name,
          Client: client(p.clientId),
          Lead: p.lead,
          Template: p.template,
          'Phase index': p.phase,
          Budget: amount(p.budgetMinor, 'INR'),
          Used: amount(p.usedMinor, 'INR'),
          Start: p.startOn,
          Due: p.dueOn,
          Example: p.example ? 'Yes' : '',
        })),
      );
    case 'tasks':
      return toCsv(
        src.tasks.map((t) => ({
          Title: t.title,
          Project: src.projects.find((p) => p.id === t.projectId)?.name ?? '',
          Phase: t.phase ?? '',
          Assignee: t.assignee,
          Due: t.dueOn ?? '',
          Priority: t.priority,
          Status: TASK_STATUSES.find((x) => x.id === t.status)!.name,
          Example: t.example ? 'Yes' : '',
        })),
      );
    case 'quotes':
      return toCsv(
        src.quotes.map(({ quote: q, totals: t }) => ({
          Number: q.number,
          For: q.recipient,
          Currency: q.currency,
          Subtotal: amount(t.subtotal.amountMinor, q.currency),
          Tax: amount(t.cgst.amountMinor + t.sgst.amountMinor + t.igst.amountMinor, q.currency),
          Total: amount(t.total.amountMinor, q.currency),
          'Valid until': q.validUntil,
          Example: q.example ? 'Yes' : '',
        })),
      );
    case 'invoices':
      return toCsv(
        src.invoices.map(({ invoice: i, client: c, totals: t, state }) => ({
          Number: i.number ?? 'Draft',
          Client: c.name,
          Type: t.documentType,
          Currency: i.currency,
          Taxable: amount(t.subtotal.amountMinor, i.currency),
          CGST: amount(t.cgst.amountMinor, i.currency),
          SGST: amount(t.sgst.amountMinor, i.currency),
          IGST: amount(t.igst.amountMinor, i.currency),
          Total: amount(t.total.amountMinor, i.currency),
          Paid: amount(state.paidMinor, i.currency),
          Due: amount(state.dueMinor, i.currency),
          Issued: i.issuedOn ?? '',
          'Due date': i.dueOn,
          'Exchange rate': i.exchangeRate ?? '',
          Example: i.example ? 'Yes' : '',
        })),
      );
    case 'payments':
      return toCsv(
        src.invoices.flatMap(({ invoice: i, client: c }) =>
          i.payments.map((p) => ({
            Invoice: i.number ?? 'Draft',
            Client: c.name,
            Amount: amount(p.amountMinor, i.currency),
            Currency: i.currency,
            'Received on': p.receivedOn,
            Method: p.method,
            Reference: p.reference ?? '',
          })),
        ),
      );
    case 'members':
      return toCsv(
        src.members.map((m) => ({
          Name: m.name,
          Email: m.email,
          Role: ROLE_LABELS[m.role],
          Joined: m.joinedAt,
        })),
      );
  }
}

/** One list as CSV, or null when the member may not export. */
export async function exportCsv(kind: ExportKind, slug?: string): Promise<string | null> {
  const src = await sourceFor(slug);
  return src ? csvOf(kind, src) : null;
}

/** Everything in one JSON file; money as decimal strings with the currency beside it. */
export async function exportJson(slug?: string): Promise<string | null> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbExport.exportAll(ctx);
  const s = store();
  const plain = (value: unknown): unknown =>
    JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: 'Amounts ending in "Minor" are in the smallest unit of the currency (paise for INR).',
      workspace: plain({ ...s.settings }),
      leads: plain(s.leads),
      clients: plain(s.clients),
      projects: plain(s.projects),
      tasks: plain(s.tasks),
      quotes: plain(s.quotes),
      // Link tokens and signing codes are access secrets, so they stay out of the file.
      proposals: plain(
        s.proposals.map((p) => {
          const copy: Partial<typeof p> = { ...p };
          delete copy.pendingCode;
          delete copy.token;
          return copy;
        }),
      ),
      invoices: plain(s.invoices),
      messages: plain(s.messages),
      members: plain(s.members),
      dailyUpdates: plain(s.dailyUpdates),
    },
    null,
    2,
  );
}

/** For the export page: how many rows each file will have (null when the member may not export). */
export async function exportCounts(slug?: string): Promise<Record<ExportKind, number> | null> {
  const src = await sourceFor(slug);
  if (!src) return null;
  return {
    leads: src.leads.length,
    clients: src.clients.length,
    projects: src.projects.length,
    tasks: src.tasks.length,
    quotes: src.quotes.length,
    invoices: src.invoices.length,
    payments: src.invoices.reduce((n, i) => n + i.invoice.payments.length, 0),
    members: src.members.length,
  };
}
