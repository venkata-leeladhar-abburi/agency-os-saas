import { ArrowSquareOut, CaretRight, PencilSimple, Tag } from '@phosphor-icons/react/dist/ssr';
import { ROLE_LABELS } from '@agency-os/core';
import { Badge, buttonVariants, Card, ExampleBadge } from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AudienceBadge } from '@/components/knowledge/browser';
import { DeleteItem } from '@/components/knowledge/delete-item';
import { KindTile } from '@/components/knowledge/kind-icon';
import { Markdown } from '@/components/knowledge/markdown';
import { knowledge, knowledgeItem, sharingClients } from '@/lib/data/knowledge';
import { folderPath, KIND_LABELS } from '@/lib/data/knowledge-types';
import { formatDate } from '@agency-os/core';
import { relativeTime } from '@/lib/data/views';
import { deleteItemAction } from '../actions';

export const metadata = { title: 'Knowledge base · Agency OS' };

export default async function KnowledgeItemPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const base = `/w/${workspace}/knowledge`;
  const [item, view] = await Promise.all([
    knowledgeItem(id, workspace),
    knowledge(workspace, { folderId: null }),
  ]);
  if (!item) notFound();
  const path = folderPath(view.folders, item.folderId);
  const clients =
    item.visibility === 'clients' && !item.allClients
      ? (await sharingClients(workspace)).filter((c) => item.clientIds.includes(c.id))
      : [];
  return (
    <article className="grid gap-6">
      <nav aria-label="Folder path">
        <ol className="flex flex-wrap items-center gap-1 p-0 text-body-sm text-muted-foreground">
          <li>
            <Link href={base} className="text-muted-foreground">
              Knowledge base
            </Link>
          </li>
          {path.map((f) => (
            <li key={f.id} className="flex items-center gap-1">
              <CaretRight size={12} aria-hidden="true" />
              <Link href={`${base}/folders/${f.id}`} className="text-muted-foreground">
                {f.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <KindTile kind={item.kind} size="lg" />
          <div className="grid min-w-0 gap-1.5">
            <h1 className="text-title-lg">{item.title}</h1>
            <p className="flex flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground">
              <span>{KIND_LABELS[item.kind]}</span>
              <span aria-hidden="true">·</span>
              <AudienceBadge item={item} />
              {item.status === 'draft' ? <Badge tone="warning">Draft</Badge> : null}
              {item.example ? <ExampleBadge /> : null}
            </p>
          </div>
        </div>
        {item.canEdit ? (
          <div className="flex flex-wrap gap-2">
            <DeleteItem
              title={item.title}
              action={deleteItemAction.bind(null, workspace, item.id, item.folderId)}
            />
            <Link
              href={`${base}/${item.id}/edit`}
              className={buttonVariants({ variant: 'primary' })}
            >
              <PencilSimple size={16} aria-hidden="true" /> Edit
            </Link>
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="grid min-w-0 content-start gap-4">
          {item.summary ? (
            <p className="text-body-lg text-muted-foreground">{item.summary}</p>
          ) : null}
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-foreground no-underline hover:bg-accent"
            >
              <span className="grid min-w-0">
                <span className="text-body-medium">Open the link</span>
                <span className="truncate text-body-sm text-muted-foreground">{item.url}</span>
              </span>
              <ArrowSquareOut
                size={18}
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
          {item.body.trim() ? (
            <Card>
              <Markdown source={item.body} />
            </Card>
          ) : !item.url ? (
            <p className="text-body text-muted-foreground">Nothing written here yet.</p>
          ) : null}
        </div>
        <aside className="grid content-start gap-4 text-body-sm">
          <Card as="h2" title="About this item">
            <dl className="grid gap-3">
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">Who sees it</dt>
                <dd>
                  {item.visibility === 'private'
                    ? 'Only the person who added it'
                    : item.roles.length
                      ? `Owners, admins, ${item.roles
                          .filter((r) => r !== 'owner' && r !== 'admin')
                          .map((r) => ROLE_LABELS[r].toLowerCase())
                          .join(', ')}`
                      : 'Everyone in the team'}
                  {item.visibility === 'clients'
                    ? item.allClients
                      ? ', and every client in their portal'
                      : `, and ${clients.map((c) => c.name).join(', ') || 'the clients picked'} in their portal`
                    : ''}
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>
                  <time dateTime={item.updatedAt} title={formatDate(item.updatedAt.slice(0, 10))}>
                    {relativeTime(item.updatedAt)}
                  </time>
                  {item.updatedBy ? ` by ${item.updatedBy}` : ''}
                </dd>
              </div>
              {item.createdBy ? (
                <div className="grid gap-0.5">
                  <dt className="text-muted-foreground">Added by</dt>
                  <dd>{item.createdBy}</dd>
                </div>
              ) : null}
              {item.tags.length ? (
                <div className="grid gap-1">
                  <dt className="text-muted-foreground">Tags</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {item.tags.map((t) => (
                      <Link
                        key={t}
                        href={`${base}?tag=${encodeURIComponent(t)}`}
                        className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-caption text-foreground no-underline hover:bg-accent"
                      >
                        <Tag size={12} aria-hidden="true" />
                        {t}
                      </Link>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </aside>
      </div>
    </article>
  );
}
