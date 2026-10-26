import { FolderSimple } from '@phosphor-icons/react/dist/ssr';
import { EmptyState, Progress } from '@agency-os/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { portalHome } from '@/lib/data/portal';
import { currentPortal } from '@/lib/portal-session';

export const metadata = { title: 'Your projects' };

export default async function PortalProjects({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = (await currentPortal(workspace))!;
  const { projects } = (await portalHome(session.clientId, workspace))!;
  if (projects.length === 1) redirect(`/p/${workspace}/projects/${projects[0]!.id}`);
  return (
    <>
      <h1 className="text-title-lg">Projects</h1>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState compact icon={FolderSimple} title="No projects yet" as="h2">
            Your projects with {session.agency} show up here.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-2 p-0">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${workspace}/projects/${p.id}`}
                className="grid min-h-control-xl gap-2 rounded-xl border border-border bg-card p-4 text-foreground no-underline"
              >
                <span className="text-body-lg font-semibold">{p.name}</span>
                <span className="text-body-sm text-muted-foreground">
                  Now: {p.phases[p.current]}
                </span>
                <Progress value={p.percent} aria-label={`${p.name} progress`} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
