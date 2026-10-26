'use client';

import {
  CheckSquareOffset,
  FolderSimple,
  FunnelSimple,
  Receipt,
  Sun,
  UsersThree,
} from '@phosphor-icons/react';
import { buttonVariants, EmptyState, TabLinks } from '@agency-os/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** Board or table: two views of the same list, switched by a link so the view is in the URL. */
export function ViewTabs({
  base,
  view,
  label,
}: {
  base: string;
  view: 'board' | 'table';
  label: string;
}) {
  return (
    <TabLinks
      label={label}
      className="mb-4"
      items={[
        { label: 'Board', href: base, active: view === 'board' },
        { label: 'Table', href: `${base}?view=table`, active: view === 'table' },
      ]}
    />
  );
}

export function LinkButton({
  href,
  children,
  primary,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link href={href} className={buttonVariants({ variant: primary ? 'primary' : 'secondary' })}>
      {children}
    </Link>
  );
}

const EMPTY_ICONS = {
  today: Sun,
  leads: FunnelSimple,
  clients: UsersThree,
  projects: FolderSimple,
  tasks: CheckSquareOffset,
  invoices: Receipt,
};

/** An empty list: what will be here and the one action that fills it. */
export function Empty({
  title,
  text,
  icon,
  action,
}: {
  title: string;
  text: string;
  icon: keyof typeof EMPTY_ICONS;
  action?: ReactNode;
}) {
  return (
    <EmptyState title={title} icon={EMPTY_ICONS[icon]} action={action}>
      {text}
    </EmptyState>
  );
}
