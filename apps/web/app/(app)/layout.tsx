import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireWorkspace } from '../../lib/server/session';
import { UserMenu, WorkspaceSwitcher } from './shell';

/** Minimal signed-in frame for M5: workspace switcher and user menu. The full shell is M6. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session, workspaces, active } = await requireWorkspace();
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-title-sm font-semibold">
            Agency OS
          </Link>
          <WorkspaceSwitcher workspaces={workspaces} activeId={active.id} />
        </div>
        <UserMenu email={session.email ?? ''} />
      </header>
      <div className="mx-auto w-full max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}
