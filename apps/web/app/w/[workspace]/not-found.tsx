'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import { buttonVariants, EmptyState } from '@agency-os/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/** A record or page that isn't in this workspace, shown inside the workspace (status 404). */
export default function WorkspaceNotFound() {
  const { workspace } = useParams<{ workspace: string }>();
  return (
    <EmptyState
      as="h1"
      icon={MagnifyingGlass}
      title="This page isn’t in your workspace"
      action={
        <Link href={`/w/${workspace}`} className={buttonVariants({ variant: 'primary' })}>
          Go to Today
        </Link>
      }
    >
      It may have been deleted, or the link is old. Ask an owner if you need access to it.
    </EmptyState>
  );
}
