import { ArrowSquareOut, CaretLeft } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KindTile } from '@/components/knowledge/kind-icon';
import { Markdown } from '@/components/knowledge/markdown';
import { portalGuides } from '@/lib/data/knowledge';
import { KIND_LABELS } from '@/lib/data/knowledge-types';
import { relativeTime } from '@/lib/data/views';
import { currentPortal } from '@/lib/portal-session';

export const metadata = { title: 'Guide' };

export default async function PortalGuide({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const session = (await currentPortal(workspace))!;
  // Only what's shared with this client can be opened, even by its link.
  const guide = (await portalGuides(session)).find((g) => g.id === id);
  if (!guide) notFound();
  return (
    <article className="grid gap-4">
      <Link
        href={`/p/${workspace}/knowledge`}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-body text-muted-foreground"
      >
        <CaretLeft size={16} aria-hidden="true" /> Guides
      </Link>
      <header className="flex gap-3">
        <KindTile kind={guide.kind} size="lg" />
        <div className="grid gap-1">
          <h1 className="text-title-lg">{guide.title}</h1>
          <p className="text-body-sm text-muted-foreground">
            {KIND_LABELS[guide.kind]} · updated {relativeTime(guide.updatedAt).toLowerCase()}
          </p>
        </div>
      </header>
      {guide.summary ? <p className="text-body-lg text-muted-foreground">{guide.summary}</p> : null}
      {guide.url ? (
        <a
          href={guide.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex min-h-control-xl items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-foreground no-underline"
        >
          <span className="grid min-w-0">
            <span className="text-body-lg font-semibold">Open the link</span>
            <span className="truncate text-body text-muted-foreground">{guide.url}</span>
          </span>
          <ArrowSquareOut size={20} aria-hidden="true" className="shrink-0" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null}
      {guide.body.trim() ? (
        <div className="rounded-xl border border-border bg-card p-4 text-body-lg">
          <Markdown source={guide.body} />
        </div>
      ) : null}
    </article>
  );
}
