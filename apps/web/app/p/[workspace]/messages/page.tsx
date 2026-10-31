import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr';
import { EmptyState } from '@agency-os/ui';
import Link from 'next/link';
import { portalHome, portalProject } from '@/lib/data/portal';
import { relativeTime } from '@/lib/data/views';
import { currentPortal } from '@/lib/portal-session';

export const metadata = { title: 'Messages' };

export default async function PortalMessages({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = (await currentPortal(workspace))!;
  const { projects } = (await portalHome(session, workspace))!;
  const threads = await Promise.all(projects.map((p) => portalProject(session, p.id)));
  const now = new Date();
  return (
    <>
      <h1 className="text-title-lg">Messages</h1>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState compact icon={ChatCircleDots} title="No messages yet" as="h2">
            Ask the team anything. They usually reply within a working day.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-2 p-0">
          {threads.map((t) => {
            if (!t) return null;
            const last = t.messages.at(-1);
            return (
              <li key={t.project.id}>
                <Link
                  href={`/p/${workspace}/projects/${t.project.id}#messages`}
                  className="grid min-h-control-xl gap-1 rounded-xl border border-border bg-card p-4 text-foreground no-underline"
                >
                  <span className="text-body-lg font-semibold">{t.project.name}</span>
                  <span className="truncate text-body-sm text-muted-foreground">
                    {last
                      ? `${last.fromClient ? 'You' : last.who}: ${last.text} · ${relativeTime(last.at, now)}`
                      : 'No messages yet. Start the conversation.'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
