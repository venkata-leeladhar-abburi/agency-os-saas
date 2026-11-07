import { ArrowUpRight, CurrencyInr, FunnelSimple, Receipt } from '@phosphor-icons/react/dist/ssr';
import { MetricCard, Progress } from '@agency-os/ui';
import Link from 'next/link';
import type { TodayItem } from '@/lib/data';

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
export function TeamLoad({
  rows,
  base,
}: {
  rows: { id: string; name: string; open: number }[];
  /** The tasks page: each name opens that person's tasks. */
  base: string;
}) {
  const most = Math.max(1, ...rows.map((r) => r.open));
  return (
    <ul className="grid gap-3 p-0">
      {rows.map((row) => (
        <li
          key={row.id}
          className="grid grid-cols-[112px_1fr_32px] items-center gap-3 text-body-sm"
        >
          <Link href={`${base}?who=${row.id}`} className="truncate">
            {row.name}
          </Link>
          <Progress
            value={Math.round((row.open / most) * 100)}
            label={<span className="sr-only">{`${row.name}: ${row.open} open`}</span>}
          />
          <span className="text-right text-muted-foreground tabular-nums">{row.open}</span>
        </li>
      ))}
    </ul>
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
      <MetricCard
        {...metrics.revenue}
        icon={CurrencyInr}
        href={`${base}/invoices?status=received`}
      />
      <MetricCard {...metrics.pending} icon={Receipt} href={`${base}/invoices?status=due`} />
      <MetricCard
        {...metrics.overdue}
        icon={Receipt}
        tone="danger"
        inverse
        href={`${base}/invoices?status=overdue`}
      />
      <MetricCard {...metrics.pipeline} icon={FunnelSimple} href={`${base}/leads`} />
    </div>
  );
}
