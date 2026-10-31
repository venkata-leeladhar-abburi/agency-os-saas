'use client';

import { Badge, CellMain, DataTable, type BadgeProps, type ColumnDef } from '@agency-os/ui';
import { useRouter } from 'next/navigation';
import type { SalesRow } from '@/lib/data/sales';

const TONE: Record<SalesRow['statusKey'], BadgeProps['tone']> = {
  draft: 'neutral',
  sent: 'info',
  viewed: 'brand',
  accepted: 'success',
  declined: 'danger',
  expired: 'warning',
  quote: 'outline',
};

const columns: ColumnDef<SalesRow, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Document',
    meta: { label: 'Document' },
    cell: ({ row }) => <CellMain title={row.original.title} subtitle={row.original.kind} />,
  },
  { accessorKey: 'number', header: 'Quote', meta: { mono: true, label: 'Quote' } },
  { accessorKey: 'amount', header: 'Amount', meta: { align: 'right', label: 'Amount' } },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge size="sm" dot tone={TONE[row.original.statusKey]}>
        {row.original.status}
      </Badge>
    ),
  },
  { accessorKey: 'updated', header: 'Updated', meta: { label: 'Updated' } },
];

export function SalesTable({ rows }: { rows: SalesRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      caption="Quotes and proposals"
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(r.href)}
    />
  );
}
