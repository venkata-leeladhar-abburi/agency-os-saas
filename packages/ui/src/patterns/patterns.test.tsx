import { FunnelSimple, House, Plus } from '@phosphor-icons/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calculateQuote } from '@agency-os/core';
import { describe, expect, it, vi } from 'vitest';
import { EXPORT_INVOICE, LUT_ARN, PIPELINE, TAX_INVOICE } from '../example/data';
import { Checklist } from './checklist';
import { CommandMenu } from './command-palette';
import { DataTable, type ColumnDef } from './data-table';
import { GateCard } from './gate-card';
import { InvoiceSummary } from './invoice-summary';
import { MetricCard } from './metric-card';
import { PhaseStepper } from './phase-stepper';
import { PipelineBoard } from './pipeline-board';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

describe('Sidebar and Topbar', () => {
  const groups = [
    {
      label: 'Sell',
      items: [
        { value: 'today', label: 'Today', icon: House, href: '/today' },
        {
          value: 'leads',
          label: 'Leads',
          icon: FunnelSimple,
          href: '/leads',
          count: 12,
          alert: true,
        },
      ],
    },
  ];

  it('marks the current page and opens search', async () => {
    const onSearch = vi.fn();
    render(
      <Sidebar
        workspace={{ name: 'One Stop Solutions' }}
        groups={groups}
        active="leads"
        onSearch={onSearch}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /Leads/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: /Today/ })).not.toHaveAttribute('aria-current');
    await userEvent.click(screen.getByRole('button', { name: /Search/ }));
    expect(onSearch).toHaveBeenCalled();
  });

  it('names icon-only links when collapsed', () => {
    render(
      <Sidebar
        workspace={{ name: 'One Stop Solutions' }}
        groups={groups}
        active="today"
        collapsed
      />,
    );
    expect(screen.getByRole('link', { name: 'Leads, 12' })).toBeInTheDocument();
  });

  it('shows breadcrumbs with the current page', () => {
    render(<Topbar crumbs={[{ label: 'One Stop Solutions', href: '/' }, { label: 'Leads' }]} />);
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'One Stop Solutions' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(crumbs).getByText('Leads')).toHaveAttribute('aria-current', 'page');
  });
});

describe('CommandMenu', () => {
  it('filters as you type and runs the chosen item with Enter', async () => {
    const onNewLead = vi.fn();
    render(
      <CommandMenu
        groups={[
          {
            label: 'Actions',
            items: [
              { id: 'new-lead', icon: Plus, label: 'New lead', onSelect: onNewLead },
              { id: 'new-invoice', icon: Plus, label: 'Create invoice' },
            ],
          },
        ]}
      />,
    );
    await userEvent.type(screen.getByRole('combobox'), 'lead');
    expect(screen.queryByText('Create invoice')).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(onNewLead).toHaveBeenCalled();
  });
});

type Row = { id: string; name: string; amount: number };
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'amount', header: 'Amount', meta: { align: 'right' } },
];

describe('DataTable', () => {
  const data = [
    { id: 'a', name: 'Kite & Co', amount: 300 },
    { id: 'b', name: 'Acme Labs', amount: 100 },
  ];

  it('sorts from the header and reports aria-sort', async () => {
    render(<DataTable caption="Clients" columns={columns} data={data} getRowId={(r) => r.id} />);
    const table = screen.getByRole('table', { name: 'Clients' });
    await userEvent.click(within(table).getByRole('button', { name: /Amount/ }));
    expect(within(table).getByRole('columnheader', { name: /Amount/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    const firstCell = within(table).getAllByRole('row')[1]!;
    expect(firstCell).toHaveTextContent('Acme Labs');
  });

  it('selects rows and shows bulk actions', async () => {
    render(
      <DataTable
        caption="Clients"
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        selectable
        bulkActions={(ids) => <button type="button">Archive {ids.length}</button>}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive 2' })).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    render(
      <DataTable
        caption="Clients"
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        empty={<p>No clients yet</p>}
      />,
    );
    expect(screen.getByText('No clients yet')).toBeInTheDocument();
  });
});

describe('PipelineBoard', () => {
  it('labels each stage with its count and gives every card a move handle', () => {
    render(<PipelineBoard columns={PIPELINE} onAddLead={() => {}} />);
    expect(screen.getByRole('region', { name: /New/ })).toHaveTextContent('3 leads');
    expect(screen.getByRole('button', { name: 'Move Kite & Co' })).toHaveAttribute(
      'aria-roledescription',
      'sortable',
    );
    expect(screen.getAllByRole('button', { name: 'Add lead' })).toHaveLength(4);
  });

  it('opens a lead from its name', async () => {
    const onOpen = vi.fn();
    render(<PipelineBoard columns={PIPELINE} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Northwind' }));
    expect(onOpen).toHaveBeenCalledWith('northwind');
  });
});

describe('MetricCard', () => {
  it('links the whole card and reads the delta in words', () => {
    render(
      <MetricCard
        label="Overdue"
        value="₹38,500"
        delta={8}
        inverse
        tone="danger"
        href="/invoices?status=overdue"
      />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/invoices?status=overdue');
    expect(link).toHaveTextContent('up 8%');
    expect(screen.getByText('₹38,500')).toHaveClass('text-danger');
  });
});

describe('PhaseStepper', () => {
  it('marks done, current, skipped and gated phases', () => {
    render(<PhaseStepper current={4} skipped={[1]} />);
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(7);
    expect(steps[4]).toHaveAttribute('aria-current', 'step');
    expect(steps[4]).toHaveTextContent('In progress');
    expect(steps[1]).toHaveTextContent('Skipped');
    expect(steps[0]).toHaveTextContent('(client sign-off)');
  });

  it('writes the position in compact mode', () => {
    render(<PhaseStepper current={3} compact />);
    expect(screen.getByText('· phase 4 of 7')).toBeInTheDocument();
    expect(screen.getByText('Next: Build')).toBeInTheDocument();
  });
});

describe('GateCard', () => {
  it('lets the client approve or ask for changes', async () => {
    const onApprove = vi.fn();
    render(
      <GateCard
        phase="Design gate"
        title="Approve the homepage design"
        view="client"
        approver="Srinivas Beere"
        onApprove={onApprove}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Approve the homepage design' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Waiting for client')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask for changes' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalled();
  });

  it('shows the decision instead of actions once approved', () => {
    render(
      <GateCard
        phase="Define gate"
        title="PRD"
        status="approved"
        approver="Srinivas Beere"
        when="14 Oct 2026"
      />,
    );
    expect(screen.getByText(/Approved by/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('InvoiceSummary', () => {
  it('shows CGST and SGST, the total and the amount in words', () => {
    render(<InvoiceSummary type="Tax invoice" number="OSS/26-27/015" totals={TAX_INVOICE} />);
    expect(screen.getByText('CGST 9%')).toBeInTheDocument();
    expect(screen.getByText('SGST 9%')).toBeInTheDocument();
    expect(screen.getByText('₹47,200.00')).toBeInTheDocument();
    expect(screen.getByText('Rupees Forty Seven Thousand Two Hundred Only')).toBeInTheDocument();
  });

  it('prints the LUT sentence and exchange rate on exports', () => {
    render(
      <InvoiceSummary
        type="Export invoice"
        totals={EXPORT_INVOICE}
        exchangeRate="84.20"
        lutArn={LUT_ARN}
      />,
    );
    expect(screen.getByText('IGST 0% (export under LUT)')).toBeInTheDocument();
    expect(screen.getByText(/1 USD = ₹84.20 · ₹1,68,400.00/)).toBeInTheDocument();
    expect(screen.getByText(/without payment of IGST/)).toBeInTheDocument();
  });

  it('shows lines before the discount, then the discount and the taxable subtotal', () => {
    const totals = calculateQuote({
      currency: 'INR',
      supplierStateCode: '37',
      placeOfSupply: { kind: 'india', stateCode: '29' },
      lines: [{ description: 'Website', quantity: '1', rateMinor: 6_000_000n, taxRateBp: 1800 }],
      discountMinor: 1_000_000n,
    });
    render(<InvoiceSummary type="Quote" totals={totals} />);
    const line = screen.getByRole('row', { name: /Website/ });
    expect(within(line).getAllByText('₹60,000.00')).toHaveLength(2);
    expect(screen.getByText('−₹10,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹50,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹59,000.00')).toBeInTheDocument();
  });
});

describe('Checklist', () => {
  it('counts progress and highlights the next step with its action', () => {
    render(
      <Checklist
        title="Get started"
        items={[
          { id: 'a', label: 'Create your workspace', done: true },
          {
            id: 'b',
            label: 'Send a proposal',
            action: <button type="button">Create proposal</button>,
          },
          { id: 'c', label: 'Invite your team', action: <button type="button">Invite</button> },
        ]}
      />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 of 3');
    expect(screen.getByText('Send a proposal').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('button', { name: 'Create proposal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument();
  });
});
