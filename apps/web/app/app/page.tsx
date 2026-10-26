import { Alert, Badge, Button, Card, EmptyState } from '@agency-os/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSession } from '../../lib/server/session';
import { requireWorkspace } from '../../lib/server/workspace';
import { switchWorkspace } from './actions';

export const metadata: Metadata = { title: 'Workspace · Agency OS' };

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  project_lead: 'Project lead',
  member: 'Member',
  finance: 'Finance',
  hr: 'HR',
};

// The full app shell, Today and navigation arrive with M6 and M15. Until then this page proves sign-in,
// the workspace and switching between workspaces work.
export default async function AppHomePage() {
  const session = await requireSession('/app');
  const { db, workspaces, current } = await requireWorkspace(session);

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-content content-start gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-overline-caps text-muted-foreground">{session.email}</p>
          <h1 className="text-title-lg">{current?.name ?? 'Your workspace'}</h1>
        </div>
        <form action="/auth/sign-out" method="post">
          <Button type="submit">Sign out</Button>
        </form>
      </header>

      {!db ? (
        <Alert tone="warning" title="The database isn’t connected">
          Add DATABASE_URL to the environment to load your workspaces.
        </Alert>
      ) : null}

      {current ? (
        <Card className="grid gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{ROLE_LABEL[current.role] ?? current.role}</Badge>
            <Badge>{current.plan}</Badge>
          </div>
          <p className="text-body text-muted-foreground">
            You’re signed in. Leads, clients, projects and invoices arrive in the next milestones.
          </p>
        </Card>
      ) : (
        <EmptyState
          title="No workspace yet"
          action={
            <Button variant="primary" asChild>
              <Link href="/setup">Create a workspace</Link>
            </Button>
          }
        >
          Create one to start, or open an invite link from your team.
        </EmptyState>
      )}

      {workspaces.length > 1 ? (
        <section aria-labelledby="switch" className="grid gap-2">
          <h2 id="switch" className="text-title-sm">
            Switch workspace
          </h2>
          <ul className="grid gap-2">
            {workspaces.map((w) => (
              <li key={w.id}>
                <form action={switchWorkspace} className="flex items-center justify-between gap-3">
                  <input type="hidden" name="workspace" value={w.id} />
                  <span className="text-body">
                    {w.name}{' '}
                    <span className="text-muted-foreground">({ROLE_LABEL[w.role] ?? w.role})</span>
                  </span>
                  <Button type="submit" size="sm" disabled={w.id === current?.id}>
                    {w.id === current?.id ? 'Current' : 'Switch'}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
