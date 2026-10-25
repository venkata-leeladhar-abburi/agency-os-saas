'use client';

import { ArrowClockwise, LockSimple, type Icon } from '@phosphor-icons/react';
import { Alert, Button, cn, EmptyState, Skeleton } from '@agency-os/ui';
import type { ReactNode } from 'react';

export type ScreenState = 'default' | 'loading' | 'empty' | 'error' | 'no-access' | (string & {});

/** A grey wireframe box with a real label: what goes here. */
export function Ph({
  label,
  className,
  h = 96,
  children,
}: {
  label: string;
  className?: string;
  h?: number | 'auto';
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-md border border-dashed border-border-strong bg-muted p-3',
        className,
      )}
      style={{ minHeight: h === 'auto' ? undefined : h }}
    >
      <span className="text-caption text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Static grey lines standing for text. */
export function Bars({ n = 3, className }: { n?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('grid gap-2', className)}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="block h-2.5 rounded-xs bg-border"
          style={{ width: `${90 - ((i * 23) % 50)}%` }}
        />
      ))}
    </span>
  );
}

/** A wireframe row in a list: a label and grey detail. */
export function Row({ label, meta, right }: { label: string; meta?: string; right?: ReactNode }) {
  return (
    <div className="flex min-h-row-default items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
      <span className="grid min-w-0">
        <span className="truncate text-body font-medium">{label}</span>
        {meta ? (
          <span className="truncate text-caption font-normal text-muted-foreground">{meta}</span>
        ) : null}
      </span>
      {right}
    </div>
  );
}

export function List({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {label ? (
        <p className="border-b border-border bg-muted px-3 py-2 text-caption text-muted-foreground">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export type StateCopy = {
  empty?: { title: string; text: string; action?: string; icon?: Icon };
  error?: { title: string; text: string };
  /** The area name for the no-access state: "Leads". */
  area?: string;
};

/** Renders the screen's loading, empty, error or no-access state instead of its content. */
export function StateView({
  state,
  copy,
  icon,
  children,
  loading,
}: {
  state: ScreenState;
  copy: StateCopy;
  icon?: Icon;
  children: ReactNode;
  loading?: ReactNode;
}) {
  if (state === 'loading') {
    return (
      <div role="status" aria-label="Loading" className="grid gap-4">
        {loading ?? (
          <>
            <Skeleton height={20} width="30%" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton height={96} />
              <Skeleton height={96} />
              <Skeleton height={96} />
            </div>
            <Skeleton height={240} />
          </>
        )}
      </div>
    );
  }
  if (state === 'empty' && copy.empty) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icon={copy.empty.icon ?? icon}
          title={copy.empty.title}
          action={
            copy.empty.action ? <Button variant="primary">{copy.empty.action}</Button> : undefined
          }
        >
          {copy.empty.text}
        </EmptyState>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <Alert
        tone="danger"
        title={copy.error?.title ?? 'This page didn’t load'}
        action={
          <Button size="sm" icon={ArrowClockwise}>
            Try again
          </Button>
        }
      >
        {copy.error?.text ?? 'Check your connection and try again. Your data is safe.'}
      </Alert>
    );
  }
  if (state === 'no-access') {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icon={LockSimple}
          title={`You don’t have access to ${copy.area ?? 'this page'}`}
          action={<Button>Go to Today</Button>}
        >
          Your role doesn’t include it. Ask an owner or admin to change your role.
        </EmptyState>
      </div>
    );
  }
  return <>{children}</>;
}
