import { beforeEach, describe, expect, it } from 'vitest';
import { filterInvoices, parseInvoiceFilter } from '../invoice-filters';
import { exampleStore, resetExampleStore } from './example-store';
import { dashboard, invoices, projectRisks } from './index';
import { removeExampleData } from './onboarding';

beforeEach(() => {
  resetExampleStore();
});

describe('dashboard', () => {
  it('adds foreign-currency invoices at their invoice-date rate', async () => {
    const d = await dashboard();
    // Pending: OSS/26-27/015 for ₹47,200, plus Northwind's US$1,200 still due at 84.20
    // (₹1,01,040).
    expect(d.metrics.pending).toMatchObject({ value: '₹1,48,240', note: '2 invoices' });
    // ₹29,500 overdue (OSS/26-27/014).
    expect(d.metrics.overdue).toMatchObject({ value: '₹29,500', note: '1 invoice' });
    expect(d.unconverted).toBe(0);
  });

  it('says why each project is at risk', async () => {
    const d = await dashboard();
    for (const r of d.atRisk) expect(r.why.length).toBeGreaterThan(0);
    const p = exampleStore().projects[0]!;
    p.dueOn = '2000-01-01';
    expect(projectRisks(p)[0]).toMatch(/^Past its due date/);
  });

  it('counts an invoice with no rate separately instead of guessing', async () => {
    const usd = exampleStore().invoices.find((i) => i.id === 'inv-16')!;
    usd.exchangeRate = null;
    const d = await dashboard();
    expect(d.unconverted).toBe(1);
    expect(d.metrics.pending.note).toBe('1 invoice');
  });

  it('shows the first-week empty state once there is nothing', async () => {
    expect((await dashboard()).empty).toBe(false);
    await removeExampleData();
    expect((await dashboard()).empty).toBe(true);
  });
});

describe('invoice filters', () => {
  it('reads the status from the link, and ignores anything else', () => {
    expect(parseInvoiceFilter('overdue')).toBe('overdue');
    expect(parseInvoiceFilter('received')).toBe('received');
    expect(parseInvoiceFilter('<script>')).toBe('all');
    expect(parseInvoiceFilter(undefined)).toBe('all');
  });
  it('matches the dashboard: due includes partly paid', async () => {
    const rows = await invoices();
    expect(
      filterInvoices(rows, 'due')
        .map((r) => r.number)
        .sort(),
    ).toEqual(['OSS/26-27/015', 'OSS/26-27/016']);
    expect(filterInvoices(rows, 'overdue').map((r) => r.number)).toEqual(['OSS/26-27/014']);
    expect(filterInvoices(rows, 'draft')).toHaveLength(1);
  });
});
