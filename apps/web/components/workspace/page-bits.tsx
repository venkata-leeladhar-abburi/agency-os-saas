'use client';

import {
  CheckSquareOffset,
  FolderSimple,
  FunnelSimple,
  Notepad,
  Receipt,
  Sun,
  UsersThree,
} from '@phosphor-icons/react';
import { buttonVariants, EmptyState } from '@agency-os/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

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
  sales: Notepad,
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
