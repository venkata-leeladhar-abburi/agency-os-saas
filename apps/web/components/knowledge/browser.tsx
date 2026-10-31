import {
  Books,
  CaretDown,
  FolderSimple,
  MagnifyingGlass,
  Tag,
} from '@phosphor-icons/react/dist/ssr';
import { ROLE_LABELS } from '@agency-os/core';
import { Badge, Button, Card, EmptyState, ExampleBadge, Input, Select } from '@agency-os/ui';
import Link from 'next/link';
import type { KnowledgeQuery, KnowledgeView } from '@/lib/data/knowledge';
import {
  audienceText,
  folderTree,
  KIND_LABELS,
  KNOWLEDGE_KINDS,
  type KnowledgeFolder,
  type KnowledgeItem,
} from '@/lib/data/knowledge-types';
import { relativeTime } from '@/lib/data/views';
import { KindTile } from './kind-icon';

const AUDIENCE_TONE = { private: 'neutral', team: 'brand', clients: 'info' } as const;

export function AudienceBadge({ item }: { item: KnowledgeItem }) {
  return <Badge tone={AUDIENCE_TONE[item.visibility]}>{audienceText(item, ROLE_LABELS)}</Badge>;
}

/** The folder tree and tags beside the knowledge base (above it on phones, folded away). */
function Sidebar({
  base,
  view,
  current,
  query,
}: {
  base: string;
  view: KnowledgeView;
  current: string | null;
  query: KnowledgeQuery;
}) {
  const tree = folderTree(view.folders);
  const link =
    'flex min-h-9 items-center gap-2 rounded-md px-2 text-body text-foreground no-underline hover:bg-accent aria-[current=page]:bg-card aria-[current=page]:font-medium aria-[current=page]:shadow-xs';
  const content = (
    <div className="grid gap-5">
      <nav aria-label="Folders">
        <p className="mb-1 px-2 text-overline-caps text-muted-foreground">Folders</p>
        <ul className="grid gap-0.5 p-0">
          <li>
            <Link
              href={base}
              aria-current={
                current === null && !query.tag && !query.kind && !query.q ? 'page' : undefined
              }
              className={link}
            >
              <Books size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">All items</span>
              <span className="text-caption text-muted-foreground tabular-nums">{view.total}</span>
            </Link>
          </li>
          {tree.map((f) => (
            <li key={f.id}>
              <Link
                href={`${base}/folders/${f.id}`}
                aria-current={current === f.id ? 'page' : undefined}
                className={link}
                style={{ paddingLeft: `${0.5 + f.depth * 1}rem` }}
              >
                <FolderSimple
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-caption text-muted-foreground tabular-nums">{f.items}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {view.tags.length ? (
        <nav aria-label="Tags">
          <p className="mb-1.5 px-2 text-overline-caps text-muted-foreground">Tags</p>
          <ul className="flex flex-wrap gap-1.5 px-2">
            {view.tags.slice(0, 24).map((t) => (
              <li key={t.tag}>
                <Link
                  href={`${base}?tag=${encodeURIComponent(t.tag)}`}
                  aria-current={query.tag === t.tag ? 'page' : undefined}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-caption text-foreground no-underline hover:bg-accent aria-[current=page]:border-primary aria-[current=page]:text-primary"
                >
                  <Tag size={12} aria-hidden="true" />
                  {t.tag}
                  <span className="text-muted-foreground tabular-nums">{t.items}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
  return (
    <aside className="min-w-0">
      <details className="group rounded-lg border border-border bg-card lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-body-medium [&::-webkit-details-marker]:hidden">
          Folders and tags
          <CaretDown
            size={16}
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-border p-2">{content}</div>
      </details>
      <div className="sticky top-4 max-lg:hidden">{content}</div>
    </aside>
  );
}

/** Search and kind filter: a plain form, so filters live in the link. */
function Filters({ action, query }: { action: string; query: KnowledgeQuery }) {
  return (
    <form method="get" action={action} role="search" className="flex flex-wrap items-end gap-2">
      {query.tag ? <input type="hidden" name="tag" value={query.tag} /> : null}
      <Input
        name="q"
        type="search"
        label="Search"
        placeholder="Title, words in it, or a tag"
        defaultValue={query.q ?? ''}
        containerClassName="min-w-0 flex-1 basis-60"
      />
      <Select
        name="kind"
        label="Kind"
        defaultValue={query.kind ?? ''}
        options={[
          { value: '', label: 'All kinds' },
          ...KNOWLEDGE_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] })),
        ]}
        containerClassName="w-full sm:w-48"
      />
      <Button type="submit" icon={MagnifyingGlass}>
        Search
      </Button>
    </form>
  );
}

function FolderCards({ base, folders }: { base: string; folders: KnowledgeFolder[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3 p-0">
      {folders.map((f) => (
        <li key={f.id}>
          <Link
            href={`${base}/folders/${f.id}`}
            className="group grid h-full content-start gap-3 rounded-lg border border-border bg-card p-4 text-foreground no-underline transition-colors hover:border-border-strong hover:bg-accent"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                <FolderSimple size={22} aria-hidden="true" />
              </span>
              {f.example ? <ExampleBadge /> : null}
            </span>
            <span className="grid gap-0.5">
              <span className="text-body-medium">{f.name}</span>
              {f.description ? (
                <span className="line-clamp-2 text-body-sm text-muted-foreground">
                  {f.description}
                </span>
              ) : null}
              <span className="text-caption text-muted-foreground">
                {f.items} {f.items === 1 ? 'item' : 'items'}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ItemsTable({
  base,
  items,
  folders,
  showFolder,
}: {
  base: string;
  items: KnowledgeItem[];
  folders: KnowledgeFolder[];
  showFolder: boolean;
}) {
  const now = new Date();
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '—';
  return (
    <Card flush>
      {/* Phones: one card per item. */}
      <ul className="grid divide-y divide-border p-0 md:hidden">
        {items.map((i) => (
          <li key={i.id} className="relative flex gap-3 p-4">
            <KindTile kind={i.kind} />
            <div className="grid min-w-0 gap-1">
              <Link
                href={`${base}/${i.id}`}
                className="text-body-medium text-foreground no-underline after:absolute after:inset-0"
              >
                {i.title}
              </Link>
              {i.summary ? <p className="text-body-sm text-muted-foreground">{i.summary}</p> : null}
              <p className="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
                <span>{KIND_LABELS[i.kind]}</span>
                <span aria-hidden="true">·</span>
                <AudienceBadge item={i} />
                {i.status === 'draft' ? <Badge tone="warning">Draft</Badge> : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <table className="w-full table-fixed text-left text-body max-md:hidden">
        <caption className="sr-only">Knowledge items</caption>
        <thead>
          <tr className="border-b border-border text-caption text-muted-foreground">
            <th scope="col" className="w-[42%] px-4 py-2.5 font-medium">
              Name
            </th>
            <th scope="col" className="w-[14%] px-4 py-2.5 font-medium">
              Kind
            </th>
            {showFolder ? (
              <th scope="col" className="w-[14%] px-4 py-2.5 font-medium max-xl:hidden">
                Folder
              </th>
            ) : null}
            <th scope="col" className="px-4 py-2.5 font-medium">
              Who sees it
            </th>
            <th scope="col" className="w-[14%] px-4 py-2.5 font-medium">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((i) => (
            <tr key={i.id} className="relative hover:bg-accent">
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <KindTile kind={i.kind} />
                  <span className="grid min-w-0 gap-0.5">
                    <Link
                      href={`${base}/${i.id}`}
                      className="truncate font-medium text-foreground no-underline after:absolute after:inset-0"
                    >
                      {i.title}
                    </Link>
                    <span className="flex min-w-0 items-center gap-1.5">
                      {i.status === 'draft' ? (
                        <Badge tone="warning" size="sm" className="shrink-0">
                          Draft
                        </Badge>
                      ) : null}
                      {i.example ? (
                        <span className="shrink-0">
                          <ExampleBadge />
                        </span>
                      ) : null}
                      {i.summary ? (
                        <span className="truncate text-body-sm text-muted-foreground">
                          {i.summary}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{KIND_LABELS[i.kind]}</td>
              {showFolder ? (
                <td className="px-4 py-3 text-muted-foreground max-xl:hidden">
                  {folderName(i.folderId)}
                </td>
              ) : null}
              <td className="px-4 py-3">
                <AudienceBadge item={i} />
              </td>
              <td className="px-4 py-3 text-body-sm text-muted-foreground">
                {relativeTime(i.updatedAt, now)}
                {i.updatedBy ? <span className="block">{i.updatedBy}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * The knowledge base, in a folder or across all of them: the folder tree, the folders here as
 * cards, and the items as a table, with search and filters in the link.
 */
export function KnowledgeBrowser({
  base,
  view,
  folder,
  query,
  actions,
}: {
  base: string;
  view: KnowledgeView;
  /** The folder being browsed; null for the top. */
  folder: KnowledgeFolder | null;
  query: KnowledgeQuery;
  actions?: React.ReactNode;
}) {
  const filtering = Boolean(query.q || query.kind || query.tag);
  const here = view.folders.filter((f) => f.parentId === (folder?.id ?? null));
  const action = folder ? `${base}/folders/${folder.id}` : base;
  const showFolder = !folder || filtering;
  const nothingAtAll = view.folders.length === 0 && view.items.length === 0 && !filtering;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <Sidebar base={base} view={view} current={folder?.id ?? null} query={query} />
      <div className="grid min-w-0 content-start gap-6">
        {nothingAtAll ? (
          <Card>
            <EmptyState icon={Books} title="Write down how your agency works" action={actions}>
              Keep your processes, prompts, tools and templates in one place, and share guides with
              your clients.
            </EmptyState>
          </Card>
        ) : (
          <>
            <Filters action={action} query={query} />
            {filtering ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
                <span>
                  {view.items.length} {view.items.length === 1 ? 'item' : 'items'}
                  {query.q ? ` matching “${query.q}”` : ''}
                  {query.kind ? ` · ${KIND_LABELS[query.kind]}` : ''}
                  {query.tag ? ` · tagged ${query.tag}` : ''}
                </span>
                <Link href={action} className="text-link underline decoration-1 underline-offset-3">
                  Clear
                </Link>
              </p>
            ) : null}
            {!filtering && here.length ? (
              <section aria-labelledby="kb-folders" className="grid gap-3">
                <h2 id="kb-folders" className="text-title-sm">
                  {folder ? 'Folders in here' : 'Folders'}
                </h2>
                <FolderCards base={base} folders={here} />
              </section>
            ) : null}
            <section aria-labelledby="kb-items" className="grid gap-3">
              <h2 id="kb-items" className="text-title-sm">
                {filtering ? 'Results' : folder ? 'Items' : 'Recently updated'}
              </h2>
              {view.items.length ? (
                <ItemsTable
                  base={base}
                  items={view.items}
                  folders={view.folders}
                  showFolder={showFolder}
                />
              ) : (
                <Card>
                  <EmptyState
                    compact
                    icon={MagnifyingGlass}
                    title={filtering ? 'Nothing matches' : 'Nothing in this folder yet'}
                    as="h3"
                  >
                    {filtering
                      ? 'Try other words, another kind, or clear the filters.'
                      : 'Add an item here, or move one in from another folder.'}
                  </EmptyState>
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
