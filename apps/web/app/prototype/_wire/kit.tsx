'use client';

import { ArrowClockwise, LockSimple, type Icon } from '@phosphor-icons/react';
import { formatMoney } from '@agency-os/core';
import { Alert, Button, EmptyState, Skeleton, type ButtonProps } from '@agency-os/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type ScreenState = 'default' | 'loading' | 'empty' | 'error' | 'no-access' | (string & {});

/** A row in a list card: a label, a muted second line and an optional action. */
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

/** A button that moves to another prototype screen, so usability tasks can be clicked through. */
export function Go({
  to,
  state,
  children,
  ...button
}: { to: string; state?: string; children: ReactNode } & Omit<
  ButtonProps,
  'asChild' | 'children'
>) {
  // A loading button can't be followed, so it stays a (disabled) button.
  if (button.loading) return <Button {...button}>{children}</Button>;
  return (
    <Button asChild {...button}>
      <Link href={`/prototype/${to}${state ? `?state=${state}` : ''}`}>{children}</Link>
    </Button>
  );
}

/** Indian money from whole rupees, through core formatting. */
export const inr = (rupees: number, compact = false) =>
  formatMoney(
    BigInt(Math.round(rupees * 100)),
    'INR',
    compact ? { compact: true } : { decimals: 0 },
  );
