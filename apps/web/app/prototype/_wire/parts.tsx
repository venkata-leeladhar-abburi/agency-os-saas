'use client';

import { calculateInvoice, formatMoney } from '@agency-os/core';
import { ArrowUpRight, Flag, Kanban, ListBullets } from '@phosphor-icons/react';
import {
  Avatar,
  Badge,
  BrandTile,
  CellMain,
  cn,
  InvoiceSummary,
  Segmented,
  DataTable,
  PipelineBoard,
  Progress,
  type BadgeProps,
  type ColumnDef,
  type PipelineColumn,
} from '@agency-os/ui';
import {
  AT_RISK,
  CLIENTS,
  LEAD_ROWS,
  PIPELINE,
  TEAM_LOAD,
  TODAY,
  type ExampleClient,
  type ExampleLeadRow,
} from '@agency-os/ui/example';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export const FULL_PIPELINE: PipelineColumn[] = [
  ...PIPELINE,
  { id: 'lost', name: 'Lost', total: '₹0', cards: [] },
];

/** The real leads board, wired to the lead record and the new-lead form. */
export function LeadsBoard({
  columns = FULL_PIPELINE,
  size,
}: {
  columns?: PipelineColumn[];
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  return (
    <PipelineBoard
      columns={columns}
      size={size}
      onOpen={() => router.push('/prototype/s14-lead-record')}
      onAddLead={() => router.push('/prototype/s15-new-lead')}
      onMove={(_, to) => {
        if (to === 'won') router.push('/prototype/s21-convert-lead');
        if (to === 'lost') router.push('/prototype/s14-lead-record?state=lost');
      }}
    />
  );
}

const STAGE_TONE: Record<ExampleLeadRow['stage'], BadgeProps['tone']> = {
  New: 'neutral',
  Contacted: 'info',
  Proposal: 'brand',
  Won: 'highlight',
  Lost: 'outline',
};

const leadColumns: ColumnDef<ExampleLeadRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Lead',
    meta: { label: 'Lead' },
    cell: ({ row }) => <CellMain title={row.original.name} subtitle={row.original.contact} />,
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    meta: { label: 'Stage' },
    cell: ({ row }) => (
      <Badge size="sm" tone={STAGE_TONE[row.original.stage]}>
        {row.original.stage}
      </Badge>
    ),
  },
  {
    accessorKey: 'valueMinor',
    header: 'Value',
    meta: { align: 'right', label: 'Value' },
    sortingFn: (a, b) =>
      a.original.valueMinor > b.original.valueMinor
        ? 1
        : a.original.valueMinor < b.original.valueMinor
          ? -1
          : 0,
    cell: ({ row }) => formatMoney(row.original.valueMinor, 'INR', { decimals: 0 }),
  },
  { accessorKey: 'source', header: 'Source', meta: { label: 'Source' } },
  {
    accessorKey: 'owner',
    header: 'Owner',
    meta: { label: 'Owner' },
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <Avatar name={row.original.owner} size="xs" />
        {row.original.owner}
      </span>
    ),
  },
  {
    accessorKey: 'followUp',
    header: 'Follow-up',
    meta: { label: 'Follow-up' },
    cell: ({ row }) =>
      row.original.overdue ? (
        <span className="font-medium text-danger">{row.original.followUp}</span>
      ) : (
        row.original.followUp
      ),
  },
];

export function LeadsTable({ bulk }: { bulk?: React.ReactNode }) {
  const router = useRouter();
  return (
    <DataTable
      caption="Leads"
      columns={leadColumns}
      data={LEAD_ROWS}
      getRowId={(r) => r.id}
      selectable
      columnPicker
      initialColumnVisibility={{ source: true }}
      bulkActions={() => bulk}
      onRowClick={() => router.push('/prototype/s14-lead-record?state=page')}
      footer={<span>Showing 7 of 7 open leads</span>}
    />
  );
}

const clientColumns: ColumnDef<ExampleClient, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Client',
    meta: { label: 'Client' },
    cell: ({ row }) => (
      <CellMain
        title={row.original.name}
        subtitle={`${row.original.contact} · ${row.original.city}`}
      />
    ),
  },
  { accessorKey: 'projects', header: 'Projects', meta: { align: 'right', label: 'Projects' } },
  {
    accessorKey: 'billedMinor',
    header: 'Billed',
    meta: { align: 'right', label: 'Billed' },
    sortingFn: (a, b) => Number(a.original.billedMinor - b.original.billedMinor),
    cell: ({ row }) => formatMoney(row.original.billedMinor, row.original.currency),
  },
  {
    accessorKey: 'outstandingMinor',
    header: 'Outstanding',
    meta: { align: 'right', label: 'Outstanding' },
    sortingFn: (a, b) => Number(a.original.outstandingMinor - b.original.outstandingMinor),
    cell: ({ row }) =>
      row.original.outstandingMinor > 0n
        ? formatMoney(row.original.outstandingMinor, row.original.currency)
        : '—',
  },
  {
    accessorKey: 'portal',
    header: 'Portal',
    meta: { label: 'Portal' },
    cell: ({ row }) => (
      <Badge
        size="sm"
        dot
        tone={
          row.original.portal === 'Active'
            ? 'success'
            : row.original.portal === 'Invited'
              ? 'warning'
              : 'neutral'
        }
      >
        {row.original.portal}
      </Badge>
    ),
  },
];

export function ClientsTable() {
  const router = useRouter();
  return (
    <DataTable
      caption="Clients"
      columns={clientColumns}
      data={CLIENTS}
      getRowId={(r) => r.id}
      columnPicker
      onRowClick={() => router.push('/prototype/s23-client-record')}
      footer={<span>Showing 5 of 5 clients</span>}
    />
  );
}

type Risk = (typeof AT_RISK)[number];
const riskColumns: ColumnDef<Risk, unknown>[] = [
  {
    accessorKey: 'client',
    header: 'Project',
    enableSorting: false,
    cell: ({ row }) => <CellMain title={row.original.client} subtitle={row.original.project} />,
  },
  {
    accessorKey: 'why',
    header: 'Why',
    enableSorting: false,
    cell: ({ row }) => (
      <Badge size="sm" tone="danger" dot>
        {row.original.why}
      </Badge>
    ),
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    enableSorting: false,
    cell: ({ row }) => (
      <Progress
        value={row.original.progress}
        tone={row.original.tone}
        className="w-36"
        aria-label={`${row.original.project} progress`}
      />
    ),
  },
];

export function RiskTable() {
  const router = useRouter();
  return (
    <DataTable
      caption="Projects at risk"
      columns={riskColumns}
      data={AT_RISK}
      getRowId={(r) => r.id}
      onRowClick={() => router.push('/prototype/s26-project-overview')}
      className="[&>div]:rounded-none [&>div]:border-x-0 [&>div]:border-b-0"
    />
  );
}

export function TodayList({ limit }: { limit?: number }) {
  return (
    <ul className="grid gap-0.5 p-0">
      {TODAY.slice(0, limit).map((item) => (
        <li key={item.title}>
          <Link
            href="/prototype/s10-today"
            className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-accent"
          >
            <span className="font-mono text-mono-sm text-muted-foreground">{item.time}</span>
            <span className="min-w-0">
              <span className="font-medium">{item.title}</span>
              <span className="text-body-sm text-muted-foreground"> · {item.meta}</span>
            </span>
            <ArrowUpRight size={14} aria-hidden="true" className="text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TeamLoad() {
  return (
    <div className="grid gap-3">
      {TEAM_LOAD.map((row) => (
        <div
          key={row.team}
          className="grid grid-cols-[96px_1fr_44px] items-center gap-3 text-body-sm"
        >
          <span>{row.team}</span>
          <Progress
            value={row.load}
            tone={row.load > 100 ? 'danger' : 'default'}
            label={<span className="sr-only">{row.team}</span>}
          />
          <span className="text-right text-muted-foreground tabular-nums">{row.load}%</span>
        </div>
      ))}
    </div>
  );
}

/** Board or table for leads: two pages, so the switch is navigation. */
export function ViewSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Segmented
      label="View"
      value={pathname.includes('s13') ? 'table' : 'board'}
      onValueChange={(v) =>
        router.push(v === 'table' ? '/prototype/s13-leads-table' : '/prototype/s12-leads-board')
      }
      items={[
        { value: 'board', label: 'Board', icon: Kanban },
        { value: 'table', label: 'Table', icon: ListBullets },
      ]}
    />
  );
}

export const KITE_QUOTE = calculateInvoice({
  currency: 'INR',
  supplierStateCode: '37',
  placeOfSupply: { kind: 'india', stateCode: '29' },
  lines: [
    {
      description: 'Website, 5 pages',
      sac: '998314',
      quantity: 1,
      rateMinor: 6_000_000n,
      taxRateBp: 1800,
    },
    {
      description: 'Copywriting',
      sac: '998314',
      quantity: 5,
      rateMinor: 400_000n,
      taxRateBp: 1800,
    },
  ],
});

const TIMELINE = [
  { phase: 'Connect', when: 'Done', gate: 'Proposal accepted' },
  { phase: 'Discover', when: '2 to 6 Nov' },
  { phase: 'Define', when: '9 to 13 Nov', gate: 'Strategy and scope' },
  { phase: 'Design', when: '16 to 27 Nov', gate: 'Design' },
  { phase: 'Build', when: '30 Nov to 11 Dec', gate: 'Acceptance testing' },
  { phase: 'Launch', when: '14 to 18 Dec', gate: 'Handover' },
];

function Section({
  title,
  children,
  editable,
}: {
  title: string;
  children: React.ReactNode;
  editable?: boolean;
}) {
  return (
    <section
      className={cn(
        'grid gap-2',
        editable && '-mx-3 rounded-md px-3 py-2 ring-border-strong hover:ring-1',
      )}
      aria-label={title}
    >
      <h2 className="text-title-sm">{title}</h2>
      {children}
    </section>
  );
}

/** The Standard proposal template filled for Kite & Co. */
export function ProposalDoc({ editable }: { editable?: boolean }) {
  return (
    <div className="grid gap-6">
      <header className="grid gap-3 border-b border-border pb-6">
        <span className="flex items-center gap-2.5 text-body font-semibold">
          <BrandTile />
          One Stop Solutions
        </span>
        <p className="text-title-xl">Proposal for Kite & Co</p>
        <p className="text-body text-muted-foreground">
          25 Oct 2026 · Prepared by Kiran Rao · valid until 8 Nov 2026
        </p>
      </header>
      <Section title="About us" editable={editable}>
        <p className="text-body-lg text-muted-foreground">
          We’re a design and engineering studio in Vijayawada. We build websites and apps for
          growing Indian businesses, and we show you progress every week.
        </p>
      </Section>
      <Section title="Your goals" editable={editable}>
        <ul className="grid list-disc gap-1 pl-5 text-body-lg">
          <li>A website that brings in enquiries, not just visitors</li>
          <li>For shop owners in Bengaluru who order wholesale</li>
          <li>We’ll know it worked when enquiries double by March</li>
        </ul>
      </Section>
      <Section title="Scope" editable={editable}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-body-medium">Included</p>
            <ul className="grid list-disc gap-1 pl-5 text-body">
              <li>Five pages, desktop and phone</li>
              <li>Copy for every page</li>
              <li>Enquiry form to your WhatsApp</li>
            </ul>
          </div>
          <div>
            <p className="mb-1 text-body-medium">Not included</p>
            <ul className="grid list-disc gap-1 pl-5 text-body text-muted-foreground">
              <li>Online payments</li>
              <li>Photography</li>
            </ul>
          </div>
        </div>
      </Section>
      <Section title="Phases and timeline" editable={editable}>
        <ol className="grid gap-1 p-0">
          {TIMELINE.map((t) => (
            <li
              key={t.phase}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-body last:border-0"
            >
              <span className="font-medium">{t.phase}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {t.when}
                {t.gate ? (
                  <Badge size="sm" tone="brand" icon={Flag}>
                    Your sign-off
                  </Badge>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Price" editable={editable}>
        <InvoiceSummary type="Quote" totals={KITE_QUOTE} />
      </Section>
      <Section title="Payment terms" editable={editable}>
        <p className="text-body">
          50% advance to start, 50% before launch. Invoices are due within 7 days.
        </p>
      </Section>
      <Section title="Terms" editable={editable}>
        <p className="text-body text-muted-foreground">
          You own the finished website and its content once the final invoice is paid. Two rounds of
          changes are included in each design phase.
        </p>
      </Section>
    </div>
  );
}
