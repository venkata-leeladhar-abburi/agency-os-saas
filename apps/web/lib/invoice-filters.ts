// The invoice list's filters: the tabs, and the dashboard's numbers linking into them.
import type { InvoiceRow } from './data';

export const INVOICE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
  { id: 'draft', label: 'Drafts' },
] as const;

/** "received" isn't a tab: it's where "Received this month" on the dashboard leads. */
export type InvoiceFilter = (typeof INVOICE_FILTERS)[number]['id'] | 'received';

export function parseInvoiceFilter(v: string | undefined): InvoiceFilter {
  return v === 'received' || INVOICE_FILTERS.some((f) => f.id === v) ? (v as InvoiceFilter) : 'all';
}

export function filterInvoices(rows: InvoiceRow[], filter: InvoiceFilter): InvoiceRow[] {
  switch (filter) {
    case 'all':
      return rows;
    case 'due':
      return rows.filter((r) => r.status === 'due' || r.status === 'partially_paid');
    case 'received':
      return rows.filter((r) => r.paidThisMonth);
    default:
      return rows.filter((r) => r.status === filter);
  }
}
