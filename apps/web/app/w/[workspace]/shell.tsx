'use client';

import { Plus, SignOut } from '@phosphor-icons/react';
import { AppShell, Button, Dialog, DialogContent, ExampleBadge } from '@agency-os/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ownerNav, SECTION_LABELS } from '@/components/workspace/nav';
import type { WorkspaceSummary } from '@/lib/data';
import { useState, type ReactNode } from 'react';
import { signOut } from './actions';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  project_lead: 'Project lead',
  member: 'Member',
  finance: 'Finance',
  hr: 'HR',
};

export function WorkspaceShell({
  current,
  all,
  user,
  example,
  children,
}: {
  current: WorkspaceSummary;
  all: WorkspaceSummary[];
  user: string;
  /** Example mode: the screens show labelled example data and sign-out is hidden. */
  example?: boolean;
  children: ReactNode;
}) {
  const [switching, setSwitching] = useState(false);
  const section = usePathname().split('/')[3] ?? 'today';
  const groups = ownerNav(current.slug);
  return (
    <>
      <AppShell
        sidebar={{
          workspace: { name: current.name, plan: current.plan },
          groups,
          active: section,
          user: { name: user, role: ROLE_LABELS[current.role] ?? current.role },
          onSwitchWorkspace: () => setSwitching(true),
          linkAs: Link,
        }}
        topbar={{
          crumbs: [{ label: SECTION_LABELS[section] ?? 'Today' }],
          linkAs: Link,
          actions: example ? (
            <ExampleBadge />
          ) : (
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" icon={SignOut}>
                Sign out
              </Button>
            </form>
          ),
        }}
      >
        {children}
      </AppShell>
      <Dialog open={switching} onOpenChange={setSwitching}>
        <DialogContent title="Switch workspace" description="Pick a workspace to open.">
          <ul className="grid gap-1">
            {all.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/w/${w.slug}`}
                  onClick={() => setSwitching(false)}
                  aria-current={w.id === current.id ? 'true' : undefined}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-body-medium no-underline hover:bg-accent aria-[current=true]:bg-accent"
                >
                  <span>{w.name}</span>
                  <span className="text-caption text-muted-foreground">
                    {ROLE_LABELS[w.role] ?? w.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/setup"
            className="mt-3 inline-flex items-center gap-2 text-body-medium text-primary no-underline"
          >
            <Plus size={16} aria-hidden="true" /> Create a workspace
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}
