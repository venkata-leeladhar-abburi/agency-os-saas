// Server only. Data export: every record as CSV, or everything as JSON (PRD E0.5).
import {
  minorDigits,
  LEAD_SOURCE_LABELS,
  ROLE_LABELS,
  toCsv,
  toDecimalString,
} from '@agency-os/core';
import { store } from './shared';
import { STAGES, TASK_STATUSES } from './types';
import { invoiceState, invoiceTotals, quoteTotals } from './views';

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

const amount = (minor: bigint, currency: string) => toDecimalString(minor, minorDigits(currency));

export function exportCsv(kind: ExportKind): string {
  const s = store();
  const client = (id: string | null) => s.clients.find((c) => c.id === id)?.name ?? '';
  switch (kind) {
    case 'leads':
      return toCsv(
        s.leads.map((l) => ({
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
        s.clients.map((c) => ({
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
        s.projects.map((p) => ({
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
        s.tasks.map((t) => ({
          Title: t.title,
          Project: s.projects.find((p) => p.id === t.projectId)?.name ?? '',
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
        s.quotes.map((q) => {
          const t = quoteTotals(q, s.settings);
          return {
            Number: q.number,
            For: q.recipient,
            Currency: q.currency,
            Subtotal: amount(t.subtotal.amountMinor, q.currency),
            Tax: amount(t.cgst.amountMinor + t.sgst.amountMinor + t.igst.amountMinor, q.currency),
            Total: amount(t.total.amountMinor, q.currency),
            'Valid until': q.validUntil,
            Example: q.example ? 'Yes' : '',
          };
        }),
      );
    case 'invoices':
      return toCsv(
        s.invoices.map((i) => {
          const c = s.clients.find((x) => x.id === i.clientId)!;
          const t = invoiceTotals(i, c, s.settings);
          const state = invoiceState(i, t.total.amountMinor);
          return {
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
          };
        }),
      );
    case 'payments':
      return toCsv(
        s.invoices.flatMap((i) =>
          i.payments.map((p) => ({
            Invoice: i.number ?? 'Draft',
            Client: client(i.clientId),
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
        s.members.map((m) => ({
          Name: m.name,
          Email: m.email,
          Role: ROLE_LABELS[m.role],
          Joined: m.joinedAt,
        })),
      );
  }
}

/** Everything in one JSON file; money as decimal strings with the currency beside it. */
export function exportJson(): string {
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

/** For the export page: how many rows each file will have. */
export function exportCounts(): Record<ExportKind, number> {
  const s = store();
  return {
    leads: s.leads.length,
    clients: s.clients.length,
    projects: s.projects.length,
    tasks: s.tasks.length,
    quotes: s.quotes.length,
    invoices: s.invoices.length,
    payments: s.invoices.reduce((n, i) => n + i.payments.length, 0),
    members: s.members.length,
  };
}
