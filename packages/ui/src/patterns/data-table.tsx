'use client';

import { CaretDown, CaretUp, CaretUpDown, Columns } from '@phosphor-icons/react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';
import { Button } from '../components/button';
import { Checkbox } from '../components/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../components/dropdown';
import { Skeleton } from '../components/skeleton';
import { cn } from '../lib/cn';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the generics must match TanStack's declaration
  interface ColumnMeta<TData, TValue> {
    /** Numbers and money are right-aligned. */
    align?: 'left' | 'right';
    /** IDs and invoice numbers are in Geist Mono. */
    mono?: boolean;
    /** The visible name in the column picker. */
    label?: string;
  }
}

export type DataTableLabels = {
  selectAll?: string;
  selectRow?: (rowId: string) => string;
  columns?: string;
  selected?: (count: number) => string;
  sortAscending?: string;
  sortDescending?: string;
};

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getRowId: (row: TData) => string;
  /** Names the table for screen readers. */
  caption: string;
  selectable?: boolean;
  density?: 'default' | 'compact';
  /** Shown above the table when rows are selected. */
  bulkActions?: (selectedIds: string[]) => ReactNode;
  /** Footer row: "Showing 25 of 120" and paging. */
  footer?: ReactNode;
  /** Shown instead of rows when there is no data. */
  empty?: ReactNode;
  loading?: boolean;
  /** Shows a column picker. */
  columnPicker?: boolean;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  onRowClick?: (row: TData) => void;
  labels?: DataTableLabels;
  className?: string;
};

/** Lists of records: about five columns, sorting, a column picker, selection with bulk actions. */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  caption,
  selectable = false,
  density = 'default',
  bulkActions,
  footer,
  empty,
  loading = false,
  columnPicker = false,
  initialSorting = [],
  initialColumnVisibility = {},
  onRowClick,
  labels,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(initialColumnVisibility);

  const selectColumn: ColumnDef<TData, unknown> = {
    id: '__select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label={labels?.selectAll ?? 'Select all rows'}
        checked={
          table.getIsAllRowsSelected()
            ? true
            : table.getIsSomeRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(value) => table.toggleAllRowsSelected(value === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={labels?.selectRow?.(row.id) ?? `Select row ${row.index + 1}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(value === true)}
        onClick={(event) => event.stopPropagation()}
      />
    ),
  };

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is fine without the React Compiler
  const table = useReactTable({
    data,
    columns: selectable ? [selectColumn, ...columns] : columns,
    getRowId,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: selectable,
    // Every column sorts the same way: smallest first, then largest first, then unsorted.
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns().length;

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {(columnPicker || (bulkActions && selectedIds.length > 0)) && (
        <div className="flex min-h-control-sm flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2" aria-live="polite">
            {bulkActions && selectedIds.length > 0 ? (
              <>
                <span className="text-body-medium">
                  {labels?.selected?.(selectedIds.length) ?? `${selectedIds.length} selected`}
                </span>
                {bulkActions(selectedIds)}
              </>
            ) : null}
          </div>
          {columnPicker ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" icon={Columns}>
                  {labels?.columns ?? 'Columns'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{labels?.columns ?? 'Columns'}</DropdownMenuLabel>
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(value === true)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {column.columnDef.meta?.label ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      )}
      <div
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
        tabIndex={0}
        role="region"
        aria-label={caption}
        className="overflow-x-auto rounded-lg border border-border bg-card"
      >
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  const SortIcon =
                    sorted === 'asc' ? CaretUp : sorted === 'desc' ? CaretDown : CaretUpDown;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className={cn(
                        'h-9 border-b border-border bg-muted px-3 text-caption whitespace-nowrap text-muted-foreground',
                        meta?.align === 'right' ? 'text-right' : 'text-left',
                        header.column.id === '__select' && 'w-10',
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1 rounded-xs hover:text-foreground',
                            meta?.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon
                            size={12}
                            aria-hidden="true"
                            className={cn(!sorted && 'opacity-60')}
                          />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={`loading-${i}`}>
                    {Array.from({ length: visibleColumns }, (__, j) => (
                      <td
                        key={j}
                        className="h-row-default border-b border-border px-3 last:border-b-0"
                      >
                        <Skeleton width={j === 0 ? '60%' : '40%'} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={row.id}
                    data-selected={row.getIsSelected() || undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'group/row [&:last-child>td]:border-b-0',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'border-b border-border px-3 whitespace-nowrap group-hover/row:bg-accent group-data-selected/row:bg-brand-soft',
                            density === 'compact' ? 'h-row-compact' : 'h-row-default',
                            meta?.align === 'right' && 'text-right tabular-nums',
                            meta?.mono && 'font-mono text-mono',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            {!loading && rows.length === 0 && empty ? (
              <tr>
                <td colSpan={visibleColumns}>{empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {footer ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-body-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Two-line cell: name and a muted second line. */
export function CellMain({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <span className="grid leading-4.5">
      <span className="font-medium">{title}</span>
      {subtitle ? (
        <span className="text-caption font-normal text-muted-foreground">{subtitle}</span>
      ) : null}
    </span>
  );
}

export type { ColumnDef } from '@tanstack/react-table';
