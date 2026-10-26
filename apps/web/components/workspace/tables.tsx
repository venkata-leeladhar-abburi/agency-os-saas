'use client';

import { formatMoney } from '@agency-os/core';
import { ArrowUpRight, CurrencyInr, FunnelSimple, Receipt } from '@phosphor-icons/react';
import {
  Avatar,
  Badge,
  CellMain,
  DataTable,
  MetricCard,
  PipelineBoard,
  Progress,
  type BadgeProps,
  type ColumnDef,
  type PipelineColumn,
} from '@agency-os/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { ClientRow, InvoiceRow, LeadRow, ProjectRow, TodayItem } from '@/lib/data';
import type { TaskRow } from '@/lib/data/tasks';
import { moveLeadAction } from '@/app/w/[workspace]/leads/actions';

const byMinor = (a: bigint, b: bigint) => (a > b ? 1 : a < b ? -1 : 0);

function Person({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={name} size="xs" />
      {name}
    </span>
  );
}

/** The leads board: open a card, add a lead, move a card to change its stage. */
export function LeadsBoard({
  columns,
  base,
  size,
}: {
  columns: PipelineColumn[];
  /** The leads path: /w/<workspace>/leads. */
  base: string;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <PipelineBoard
      columns={columns}
      size={size}
      onOpen={(id) => router.push(`${base}/${id}`)}
      onAddLead={size === 'sm' ? undefined : () => router.push(`${base}/new`)}
      onMove={(id, to) => {
        // Lost needs a reason, so it opens the lead to ask for one.
        if (to === 'lost') return router.push(`${base}/${id}?lost=1`);
        startTransition(async () => {
          const next = await moveLeadAction(id, to);
          if (next) router.push(`${base.replace(/\/leads$/, '')}/${next}`);
          else router.refresh();
        });
      }}
    />
  );
}

const STAGE_TONE: Record<LeadRow['stage'], BadgeProps['tone']> = {
  New: 'neutral',
  Contacted: 'info',
  Proposal: 'brand',
  Won: 'highlight',
  Lost: 'outline',
};

const leadColumns: ColumnDef<LeadRow, unknown>[] = [
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
    sortingFn: (a, b) => byMinor(a.original.valueMinor, b.original.valueMinor),
    cell: ({ row }) => formatMoney(row.original.valueMinor, 'INR', { decimals: 0 }),
  },
  { accessorKey: 'source', header: 'Source', meta: { label: 'Source' } },
  {
    accessorKey: 'owner',
    header: 'Owner',
    meta: { label: 'Owner' },
    cell: ({ row }) => <Person name={row.original.owner} />,
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

export function LeadsTable({ rows, base }: { rows: LeadRow[]; base: string }) {
  const router = useRouter();
  return (
    <DataTable
      onRowClick={(r) => router.push(`${base}/${r.id}`)}
      caption="Leads"
      columns={leadColumns}
      data={rows}
      getRowId={(r) => r.id}
      selectable
      columnPicker
      footer={<span>Showing {rows.length} leads</span>}
    />
  );
}

const PORTAL_TONE: Record<ClientRow['portal'], BadgeProps['tone']> = {
  Active: 'success',
  Invited: 'warning',
  'Not invited': 'neutral',
};

const clientColumns: ColumnDef<ClientRow, unknown>[] = [
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
    sortingFn: (a, b) => byMinor(a.original.billedMinor, b.original.billedMinor),
    cell: ({ row }) => formatMoney(row.original.billedMinor, row.original.currency),
  },
  {
    accessorKey: 'outstandingMinor',
    header: 'Outstanding',
    meta: { align: 'right', label: 'Outstanding' },
    sortingFn: (a, b) => byMinor(a.original.outstandingMinor, b.original.outstandingMinor),
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
      <Badge size="sm" dot tone={PORTAL_TONE[row.original.portal]}>
        {row.original.portal}
      </Badge>
    ),
  },
];

export function ClientsTable({ rows, base }: { rows: ClientRow[]; base: string }) {
  const router = useRouter();
  return (
    <DataTable
      onRowClick={(r) => router.push(`${base}/${r.id}`)}
      caption="Clients"
      columns={clientColumns}
      data={rows}
      getRowId={(r) => r.id}
      columnPicker
      footer={<span>Showing {rows.length} clients</span>}
    />
  );
}

const HEALTH_TONE: Record<ProjectRow['health'], BadgeProps['tone']> = {
  'On track': 'success',
  'At risk': 'warning',
  Late: 'danger',
};

const projectColumns: ColumnDef<ProjectRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Project',
    meta: { label: 'Project' },
    cell: ({ row }) => <CellMain title={row.original.name} subtitle={row.original.client} />,
  },
  {
    accessorKey: 'lead',
    header: 'Lead',
    meta: { label: 'Lead' },
    cell: ({ row }) => <Person name={row.original.lead} />,
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    meta: { label: 'Progress' },
    cell: ({ row }) => (
      <Progress
        value={row.original.progress}
        className="w-32"
        aria-label={`${row.original.name} progress`}
      />
    ),
  },
  { accessorKey: 'nextGate', header: 'Next gate', meta: { label: 'Next gate' } },
  {
    accessorKey: 'health',
    header: 'Health',
    meta: { label: 'Health' },
    cell: ({ row }) => (
      <Badge size="sm" dot tone={HEALTH_TONE[row.original.health]}>
        {row.original.health}
      </Badge>
    ),
  },
  { accessorKey: 'due', header: 'Due', meta: { label: 'Due' } },
];

export function ProjectsTable({ rows, base }: { rows: ProjectRow[]; base: string }) {
  const router = useRouter();
  return (
    <DataTable
      onRowClick={(r) => router.push(`${base}/${r.id}`)}
      caption="Projects"
      columns={projectColumns}
      data={rows}
      getRowId={(r) => r.id}
      columnPicker
      initialColumnVisibility={{ due: false }}
      footer={<span>Showing {rows.length} projects</span>}
    />
  );
}

const PRIORITY_TONE: Record<TaskRow['priority'], BadgeProps['tone']> = {
  Low: 'neutral',
  Normal: 'info',
  High: 'warning',
};

const taskColumns: ColumnDef<TaskRow, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Task',
    meta: { label: 'Task' },
    cell: ({ row }) => <CellMain title={row.original.title} subtitle={row.original.project} />,
  },
  {
    accessorKey: 'assignee',
    header: 'Assignee',
    meta: { label: 'Assignee' },
    cell: ({ row }) => <Person name={row.original.assignee} />,
  },
  {
    accessorKey: 'due',
    header: 'Due',
    meta: { label: 'Due' },
    cell: ({ row }) => (
      <span className={row.original.overdue ? 'font-medium text-danger' : undefined}>
        {row.original.due}
      </span>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    meta: { label: 'Priority' },
    cell: ({ row }) => (
      <Badge size="sm" tone={PRIORITY_TONE[row.original.priority]}>
        {row.original.priority}
      </Badge>
    ),
  },
  { accessorKey: 'status', header: 'Status', meta: { label: 'Status' } },
];

export function TasksTable({ rows, base }: { rows: TaskRow[]; base: string }) {
  const router = useRouter();
  return (
    <DataTable
      onRowClick={(r) => router.push(`${base}/${r.id}`)}
      caption="Tasks"
      columns={taskColumns}
      data={rows}
      getRowId={(r) => r.id}
      selectable
    />
  );
}

const STATUS_COLUMNS = ['To do', 'In progress', 'In review', 'Done'] as const;

export function TaskBoard({ rows, base }: { rows: TaskRow[]; base: string }) {
  return (
    <div
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
      tabIndex={0}
      role="region"
      aria-label="Task board"
      className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2"
    >
      {STATUS_COLUMNS.map((col) => {
        const list = rows.filter((t) => t.status === col);
        return (
          <section
            key={col}
            aria-label={col}
            className="grid content-start gap-2 rounded-lg bg-muted p-2"
          >
            <header className="flex items-center gap-1.5 px-1.5 pt-1 text-body-sm font-semibold">
              {col}
              <span className="rounded-full bg-card px-1.5 text-caption leading-4.5 text-muted-foreground">
                {list.length}
              </span>
            </header>
            <ul className="grid gap-2 p-0">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${base}/${t.id}`}
                    className="grid gap-2 rounded-md border border-border bg-card p-3 text-foreground no-underline shadow-xs hover:border-border-strong"
                  >
                    <span className="text-body font-medium">{t.title}</span>
                    <span className="text-caption font-normal text-muted-foreground">
                      {t.project}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <Avatar name={t.assignee} size="xs" />
                      <span
                        className={
                          t.overdue
                            ? 'text-caption font-medium text-danger'
                            : 'text-caption font-normal text-muted-foreground'
                        }
                      >
                        {t.due}
                      </span>
                    </span>
                    {t.subtasks || t.comments ? (
                      <span className="text-caption font-normal text-muted-foreground">
                        {[
                          t.subtasks ? `${t.subtasks} subtasks` : null,
                          t.comments
                            ? `${t.comments} ${t.comments === 1 ? 'comment' : 'comments'}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const INVOICE_TONE: Record<InvoiceRow['status'], BadgeProps['tone']> = {
  draft: 'neutral',
  due: 'warning',
  overdue: 'danger',
  paid: 'success',
  partially_paid: 'info',
};

const invoiceColumns: ColumnDef<InvoiceRow, unknown>[] = [
  { accessorKey: 'number', header: 'Number', meta: { mono: true, label: 'Number' } },
  { accessorKey: 'client', header: 'Client', meta: { label: 'Client' } },
  { accessorKey: 'amount', header: 'Amount', meta: { align: 'right', label: 'Amount' } },
  { accessorKey: 'issued', header: 'Issued', meta: { label: 'Issued' } },
  { accessorKey: 'due', header: 'Due', meta: { label: 'Due' } },
  {
    accessorKey: 'statusText',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge size="sm" dot tone={INVOICE_TONE[row.original.status]}>
        {row.original.statusText}
      </Badge>
    ),
  },
];

export function InvoicesTable({ rows, base }: { rows: InvoiceRow[]; base: string }) {
  const router = useRouter();
  return (
    <DataTable
      onRowClick={(r) => router.push(`${base}/${r.id}`)}
      caption="Invoices"
      columns={invoiceColumns}
      data={rows}
      getRowId={(r) => r.id}
      selectable
      columnPicker
      footer={<span>Showing {rows.length} invoices this financial year</span>}
    />
  );
}

type Risk = {
  id: string;
  client: string;
  project: string;
  why: string;
  progress: number;
  tone: 'default' | 'danger';
};
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

export function RiskTable({ rows, base }: { rows: Risk[]; base: string }) {
  const router = useRouter();
  return (
    <DataTable
      onRowClick={(r) => router.push(`${base}/${r.id}`)}
      caption="Projects at risk"
      columns={riskColumns}
      data={rows}
      getRowId={(r) => r.id}
      className="[&>div]:rounded-none [&>div]:border-x-0 [&>div]:border-b-0"
    />
  );
}

/** What needs doing today, grouped; each row opens its record. */
export function TodayList({ items, limit }: { items: TodayItem[]; limit?: number }) {
  return (
    <ul className="grid gap-0.5 p-0">
      {items.slice(0, limit).map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-accent"
          >
            <span className="grid min-w-0">
              <span className="truncate font-medium">{item.title}</span>
              <span
                className={
                  item.overdue
                    ? 'truncate text-caption font-medium text-danger'
                    : 'truncate text-caption font-normal text-muted-foreground'
                }
              >
                {item.meta}
              </span>
            </span>
            <ArrowUpRight size={14} aria-hidden="true" className="text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Open tasks per person, as bars against the busiest person. */
export function TeamLoad({ rows }: { rows: { name: string; open: number }[] }) {
  const most = Math.max(1, ...rows.map((r) => r.open));
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[112px_1fr_32px] items-center gap-3 text-body-sm"
        >
          <span className="truncate">{row.name}</span>
          <Progress
            value={Math.round((row.open / most) * 100)}
            label={<span className="sr-only">{row.name}</span>}
          />
          <span className="text-right text-muted-foreground tabular-nums">{row.open}</span>
        </div>
      ))}
    </div>
  );
}

type Metric = { label: string; value: string; note?: string };

export function DashboardMetrics({
  metrics,
  base,
}: {
  metrics: Record<'revenue' | 'pending' | 'overdue' | 'pipeline', Metric>;
  base: string;
}) {
  return (
    <div className="mb-4 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
      <MetricCard {...metrics.revenue} icon={CurrencyInr} href={`${base}/invoices`} />
      <MetricCard {...metrics.pending} icon={Receipt} href={`${base}/invoices`} />
      <MetricCard
        {...metrics.overdue}
        icon={Receipt}
        tone="danger"
        inverse
        href={`${base}/invoices`}
      />
      <MetricCard {...metrics.pipeline} icon={FunnelSimple} href={`${base}/leads`} />
    </div>
  );
}
