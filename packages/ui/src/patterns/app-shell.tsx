'use client';

import { List } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { Sheet, SheetContent } from '../components/sheet';
import { cn } from '../lib/cn';
import { Sidebar, type SidebarProps } from './sidebar';
import { Topbar, type TopbarProps } from './topbar';

export type AppShellProps = {
  sidebar: SidebarProps;
  topbar: Omit<TopbarProps, 'leading'>;
  children: ReactNode;
  /** A panel beside the content, such as the lead drawer. */
  aside?: ReactNode;
  labels?: { openMenu?: string; menu?: string; skipToContent?: string };
  className?: string;
};

/** The agency app frame: sidebar (a drawer on phones), top bar and content up to 1280px. */
export function AppShell({ sidebar, topbar, children, aside, labels, className }: AppShellProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'grid h-dvh grid-cols-[auto_1fr] bg-background text-foreground max-lg:grid-cols-1',
        className,
      )}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 text-body-medium shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {labels?.skipToContent ?? 'Skip to content'}
      </a>
      <div className="h-dvh max-lg:hidden">
        <Sidebar {...sidebar} />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          title={labels?.menu ?? 'Menu'}
          className="p-0 [&>div:first-child]:hidden [&>div:nth-child(2)]:p-0"
        >
          <Sidebar {...sidebar} className="w-full border-r-0" />
        </SheetContent>
      </Sheet>
      <div className="relative flex min-w-0 flex-col overflow-hidden">
        <Topbar
          {...topbar}
          leading={
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={labels?.openMenu ?? 'Open menu'}
              className="-ml-2 grid size-control-md cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            >
              <List size={20} aria-hidden="true" />
            </button>
          }
        />
        <div className="flex min-h-0 flex-1">
          <main
            id="main"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-y-auto px-8 pt-6 pb-8 outline-none max-md:px-4 max-md:pt-4"
          >
            <div className="mx-auto max-w-content">{children}</div>
          </main>
          {aside}
        </div>
      </div>
    </div>
  );
}

/** The page head: one title-lg (or the title-xl greeting), a subtitle and the page's actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  greeting,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  greeting?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className={greeting ? 'text-title-xl' : 'text-title-lg'}>{title}</h1>
        {subtitle ? <p className="mt-1 text-body text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Marks sample data, so nobody mistakes it for real records. */
export function ExampleBadge({ label = 'Example data' }: { label?: string }) {
  return (
    <span className="inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-2 py-0.5 font-mono text-[11px] tracking-[0.04em] text-muted-foreground uppercase">
      {label}
    </span>
  );
}
