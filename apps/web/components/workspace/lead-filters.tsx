import { BookmarkSimple, Funnel, Trash } from '@phosphor-icons/react/dist/ssr';
import { LEAD_SOURCE_LABELS, type LeadSource } from '@agency-os/core';
import { Button, Select } from '@agency-os/ui';
import Link from 'next/link';
import type { FormState } from '@/lib/form-state';
import {
  hasLeadFilter,
  leadFilterFromQuery,
  leadFilterQuery,
  type LeadFilter,
} from '@/lib/data/lead-filter';
import type { SavedView } from '@/lib/data/saved-views';
import { RememberFilter, SaveViewForm } from './lead-views';

/**
 * The leads page's filters (source, owner, follow-ups due) and your saved views. Filters live in
 * the page's link, so a refresh or a shared link keeps them; a plain form, so they work before
 * the page's script loads.
 */
export function LeadFilters({
  base,
  table,
  filter,
  owners,
  sources,
  dueCount,
  views,
  cookie,
  saveAction,
  deleteAction,
}: {
  base: string;
  table: boolean;
  filter: LeadFilter;
  owners: string[];
  sources: LeadSource[];
  dueCount: number;
  views: SavedView[];
  cookie: string;
  saveAction: (prev: FormState, form: FormData) => Promise<FormState>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const query = leadFilterQuery(filter);
  const href = (f: LeadFilter, all = false) => {
    const q = new URLSearchParams(leadFilterQuery(f));
    if (table) q.set('view', 'table');
    if (all) q.set('all', '1');
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const filtered = hasLeadFilter(filter);
  const showing = [
    filter.source ? LEAD_SOURCE_LABELS[filter.source] : null,
    filter.owner ? `owned by ${filter.owner}` : null,
    filter.due ? 'follow-ups due' : null,
  ].filter(Boolean);
  const current = views.find((v) => v.query === query);
  return (
    <section aria-label="Filters" className="mb-4 grid gap-3">
      <RememberFilter name={cookie} path={base} query={query} />
      <form method="get" action={base} className="flex flex-wrap items-end gap-2">
        {table ? <input type="hidden" name="view" value="table" /> : null}
        {filter.due ? <input type="hidden" name="due" value="1" /> : null}
        <Select
          name="source"
          label="Source"
          defaultValue={filter.source ?? ''}
          options={[
            { value: '', label: 'All sources' },
            ...[...new Set([...sources, ...(filter.source ? [filter.source] : [])])].map((s) => ({
              value: s,
              label: LEAD_SOURCE_LABELS[s],
            })),
          ]}
          containerClassName="w-full sm:w-48"
        />
        <Select
          name="owner"
          label="Owner"
          defaultValue={filter.owner ?? ''}
          options={[
            { value: '', label: 'Anyone' },
            ...[...new Set([...owners, ...(filter.owner ? [filter.owner] : [])])].map((o) => ({
              value: o,
              label: o,
            })),
          ]}
          containerClassName="w-full sm:w-48"
        />
        <Button type="submit" icon={Funnel}>
          Apply filters
        </Button>
        <Link
          href={href({ ...filter, due: !filter.due })}
          className="inline-flex h-control-md items-center px-1 text-body text-link underline decoration-1 underline-offset-3"
        >
          {filter.due ? 'Show every follow-up' : `Follow-ups due · ${dueCount}`}
        </Link>
      </form>
      {filtered ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          <span>
            Showing{' '}
            {current ? (
              <strong className="font-medium text-foreground">{current.name}</strong>
            ) : null}
            {current ? ': ' : ''}
            {showing.join(' · ')}
          </span>
          <Link
            href={href({}, true)}
            className="text-link underline decoration-1 underline-offset-3"
          >
            Clear filters
          </Link>
        </p>
      ) : null}
      <details className="group rounded-md border border-border bg-card">
        <summary className="flex h-control-md cursor-pointer list-none items-center gap-2 px-3 text-body-medium [&::-webkit-details-marker]:hidden">
          <BookmarkSimple size={16} aria-hidden="true" />
          Saved views{views.length ? ` · ${views.length}` : ''}
        </summary>
        <div className="grid gap-4 border-t border-border p-3">
          {views.length ? (
            <ul className="grid gap-1">
              {views.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={href(leadFilterFromQuery(v.query))}
                    aria-current={v.query === query ? 'true' : undefined}
                    className="min-w-0 truncate py-2 text-body text-link underline decoration-1 underline-offset-3 aria-[current]:font-medium"
                  >
                    {v.name}
                  </Link>
                  <form action={deleteAction.bind(null, v.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      icon={Trash}
                      aria-label={`Delete the view ${v.name}`}
                    >
                      Delete
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              No saved views yet. Choose some filters, then save them here to come back to them in
              one click. Only you see your saved views.
            </p>
          )}
          {filtered ? (
            <SaveViewForm action={saveAction} />
          ) : views.length ? (
            <p className="text-body-sm text-muted-foreground">
              Choose some filters to save another view.
            </p>
          ) : null}
        </div>
      </details>
    </section>
  );
}
