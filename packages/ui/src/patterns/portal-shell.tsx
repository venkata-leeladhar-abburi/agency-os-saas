'use client';

import { CaretRight, type Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Avatar } from '../components/avatar';
import { cn } from '../lib/cn';
import type { LinkComponent } from './link';
import { BrandTile } from './logo';

export type PortalTab = { value: string; label: string; icon: Icon; href: string };

export type PortalShellProps = {
  agency: string;
  client: string;
  tabs: PortalTab[];
  active?: string;
  children: ReactNode;
  linkAs?: LinkComponent;
  navLabel?: string;
  className?: string;
};

/** The client portal: phone-first, agency brand at the top, bottom tabs on phones, top tabs on larger screens. */
export function PortalShell({
  agency,
  client,
  tabs,
  active,
  children,
  linkAs,
  navLabel = 'Portal',
  className,
}: PortalShellProps) {
  const Anchor = linkAs ?? 'a';
  const tabLinks = (variant: 'top' | 'bottom') =>
    tabs.map(({ value, label, icon: IconComponent, href }) => {
      const selected = value === active;
      return (
        <li key={value} className={variant === 'bottom' ? 'flex' : undefined}>
          <Anchor
            href={href}
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'no-underline transition-colors duration-120',
              variant === 'bottom'
                ? 'grid min-h-control-xl flex-1 justify-items-center gap-0.5 pt-1 text-[11px] leading-4 font-medium text-muted-foreground'
                : 'inline-flex h-control-md items-center gap-2 rounded-md px-3 text-body-medium text-muted-foreground hover:bg-accent hover:text-foreground',
              selected &&
                (variant === 'bottom'
                  ? 'text-primary'
                  : 'bg-card text-foreground shadow-xs ring-1 ring-border'),
            )}
          >
            <IconComponent
              size={22}
              weight={selected ? 'fill' : 'regular'}
              aria-hidden="true"
              className={cn(variant === 'top' && 'size-4.5', selected && 'text-primary')}
            />
            {label}
          </Anchor>
        </li>
      );
    });

  return (
    <div className={cn('flex min-h-dvh flex-col bg-background text-foreground', className)}>
      <header className="mx-auto flex w-full max-w-content items-center justify-between gap-3 px-5 pt-4 pb-3">
        <span className="flex items-center gap-2.5 text-body font-semibold">
          <BrandTile size="lg" tone="ink" />
          {agency}
        </span>
        <nav aria-label={navLabel} className="max-md:hidden">
          <ul className="flex gap-1 p-0">{tabLinks('top')}</ul>
        </nav>
        <Avatar name={client} size="md" />
      </header>
      <main className="mx-auto grid w-full max-w-prose flex-1 content-start gap-4 px-5 pb-24 md:pb-10">
        {children}
      </main>
      <nav
        aria-label={navLabel}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[max(env(safe-area-inset-bottom),12px)] md:hidden"
      >
        <ul
          className="grid p-0 px-2 pt-2"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        >
          {tabLinks('bottom')}
        </ul>
      </nav>
    </div>
  );
}

export type NeedsYouItemProps = {
  icon: Icon;
  tone?: 'brand' | 'warning';
  /** Starts with a verb: "Approve the dashboard design", "Pay ₹47,200". */
  title: string;
  /** Who it is from, a date or an amount. */
  detail?: string;
  href: string;
  linkAs?: LinkComponent;
};

/** A "Needs you" card on the portal home: one thing the client should do. */
export function NeedsYouItem({
  icon: IconComponent,
  tone = 'brand',
  title,
  detail,
  href,
  linkAs,
}: NeedsYouItemProps) {
  const Anchor = linkAs ?? 'a';
  return (
    <Anchor
      href={href}
      className="flex min-h-control-xl items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-card-foreground no-underline shadow-xs transition-[border-color,box-shadow] duration-120 hover:border-border-strong hover:shadow-sm"
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-lg',
          tone === 'brand'
            ? 'bg-brand-soft text-brand-soft-foreground'
            : 'bg-warning-soft text-warning',
        )}
      >
        <IconComponent size={20} aria-hidden="true" />
      </span>
      <span className="grid flex-1 leading-5">
        <span className="text-body-lg font-semibold">{title}</span>
        {detail ? <span className="text-body-sm text-muted-foreground">{detail}</span> : null}
      </span>
      <CaretRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
    </Anchor>
  );
}
