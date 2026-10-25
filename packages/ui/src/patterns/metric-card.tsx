'use client';

import { TrendDown, TrendUp, type Icon } from '@phosphor-icons/react';
import { useId, type ReactNode } from 'react';
import { Badge } from '../components/badge';
import { cn } from '../lib/cn';
import type { LinkComponent } from './link';

/** A small trend line. Decorative: the number next to it carries the meaning. */
export function Sparkline({
  points,
  tone = 'default',
  width = 72,
  height = 28,
  className,
}: {
  points: number[];
  tone?: 'default' | 'danger';
  width?: number;
  height?: number;
  className?: string;
}) {
  const gradient = useId();
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 3;
  const coords = points.map((p, i) => [
    pad + (i * (width - pad * 2)) / (points.length - 1),
    pad + (1 - (p - min) / span) * (height - pad * 2),
  ]);
  const line = coords
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x?.toFixed(1)} ${y?.toFixed(1)}`)
    .join(' ');
  const last = coords[coords.length - 1] as number[];
  const first = coords[0] as number[];
  const area = `${line} L${last[0]?.toFixed(1)} ${height} L${first[0]?.toFixed(1)} ${height} Z`;
  const danger = tone === 'danger';
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0"
            className={danger ? 'text-danger-soft' : 'text-brand-soft'}
            stopColor="currentColor"
          />
          <stop
            offset="1"
            className={danger ? 'text-danger-soft' : 'text-brand-soft'}
            stopColor="currentColor"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradient})`} />
      <path
        d={line}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={danger ? 'stroke-red-600' : 'stroke-chart-1'}
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={3}
        strokeWidth={2}
        className={cn('stroke-card', danger ? 'fill-red-600' : 'fill-chart-1')}
      />
    </svg>
  );
}

export type MetricCardProps = {
  label: string;
  /** The formatted number: "₹4,86,000". */
  value: ReactNode;
  icon?: Icon;
  /** Change in percent against the previous period. */
  delta?: number;
  /** Down is good (overdue, costs). */
  inverse?: boolean;
  note?: ReactNode;
  spark?: number[];
  /** Money at risk. */
  tone?: 'default' | 'danger';
  /** The whole card links to the list behind the number. */
  href?: string;
  linkAs?: LinkComponent;
  /** Read after the delta, e.g. "vs September". */
  deltaLabel?: (delta: number) => string;
  className?: string;
};

/** A number people decide on, linking to the list behind it. */
export function MetricCard({
  label,
  value,
  icon: IconComponent,
  delta,
  inverse,
  note,
  spark,
  tone = 'default',
  href,
  linkAs,
  deltaLabel = (d) => `${d > 0 ? 'up' : 'down'} ${Math.abs(d)}%`,
  className,
}: MetricCardProps) {
  const good = delta === undefined || delta === 0 ? undefined : inverse ? delta < 0 : delta > 0;
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-body-sm font-medium text-muted-foreground">
        {IconComponent ? <IconComponent size={16} aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="flex min-w-0 items-end justify-between gap-3">
        <span
          className={cn(
            'text-metric whitespace-nowrap tabular-nums',
            tone === 'danger' && 'text-danger',
          )}
        >
          {value}
        </span>
        {spark ? <Sparkline points={spark} tone={tone} className="mb-1" /> : null}
      </span>
      <span className="flex min-h-5 items-center gap-2">
        {delta !== undefined && delta !== 0 ? (
          <Badge
            size="sm"
            tone={good ? 'success' : 'danger'}
            icon={delta > 0 ? TrendUp : TrendDown}
          >
            <span aria-hidden="true">
              {delta > 0 ? '+' : '−'}
              {Math.abs(delta)}%
            </span>
            <span className="sr-only">{deltaLabel(delta)}</span>
          </Badge>
        ) : null}
        {note ? (
          <span className="text-caption font-normal text-muted-foreground">{note}</span>
        ) : null}
      </span>
    </>
  );
  const classes = cn(
    'relative grid min-w-0 gap-1.5 overflow-hidden rounded-lg border border-border bg-card px-5 py-4 text-card-foreground no-underline transition-[border-color,box-shadow] duration-120 max-sm:px-4',
    href && 'hover:border-border-strong hover:shadow-sm',
    className,
  );
  if (href) {
    const Anchor = linkAs ?? 'a';
    return (
      <Anchor href={href} className={classes}>
        {body}
      </Anchor>
    );
  }
  return <div className={classes}>{body}</div>;
}
