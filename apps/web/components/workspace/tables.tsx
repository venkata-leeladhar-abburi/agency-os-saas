'use client';

import { formatMoney } from '@agency-os/core';
import {
  Avatar,
  Badge,
  CellMain,
  DataTable,
  Progress,
  type BadgeProps,
  type ColumnDef,
} from '@agency-os/ui';
import { useRouter } from 'next/navigation';
import type { ClientRow, InvoiceRow, LeadRow, ProjectRow } from '@/lib/data';
import type { TaskRow } from '@/lib/data/tasks';

const byMinor = (a: bigint, b: bigint) => (a > b ? 1 : a < b ? -1 : 0);

function Person({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={name} size="xs" />
      {name}
    </span>
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
