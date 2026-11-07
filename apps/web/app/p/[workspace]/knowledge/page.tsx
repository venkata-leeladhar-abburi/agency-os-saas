import { Books } from '@phosphor-icons/react/dist/ssr';
import { EmptyState } from '@agency-os/ui';
import Link from 'next/link';
import { KindTile } from '@/components/knowledge/kind-icon';
import { portalGuides } from '@/lib/data/knowledge';
import { KIND_LABELS } from '@/lib/data/knowledge-types';
import { currentPortal } from '@/lib/portal-session';

export const metadata = { title: 'Guides' };

/** What the agency shares with this client: how-tos, guides and links, by folder. */
export default async function PortalGuides({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const session = (await currentPortal(workspace))!;
  const guides = await portalGuides(session);
  const groups = new Map<string, typeof guides>();
  for (const g of guides) {
    const key = g.folder ?? 'Other guides';
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  return (
    <>
      <div>
        <h1 className="text-title-lg">Guides</h1>
        <p className="text-body text-muted-foreground">
          How-tos and references from {session.agency} for {session.company}.
        </p>
      </div>
      {guides.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState compact icon={Books} title="No guides yet" as="h2">
            When {session.agency} shares a guide with you, it shows here.
          </EmptyState>
        </div>
      ) : (
        [...groups].map(([folder, list]) => (
          <section key={folder} aria-labelledby={`g-${folder}`} className="grid gap-2">
            <h2 id={`g-${folder}`} className="text-title-sm">
              {folder}
            </h2>
            <ul className="grid gap-2 p-0">
              {list.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/p/${workspace}/knowledge/${g.id}`}
                    className="flex min-h-control-xl gap-3 rounded-xl border border-border bg-card p-4 text-foreground no-underline hover:bg-accent"
                  >
                    <KindTile kind={g.kind} />
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-body-lg font-semibold">{g.title}</span>
                      {g.summary ? (
                        <span className="text-body text-muted-foreground">{g.summary}</span>
                      ) : null}
                      <span className="text-body-sm text-muted-foreground">
                        {KIND_LABELS[g.kind]}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
