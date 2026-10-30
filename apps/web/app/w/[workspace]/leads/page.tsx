import { DownloadSimple, Plus, UploadSimple } from '@phosphor-icons/react/dist/ssr';
import { formatMoney } from '@agency-os/core';
import { buttonVariants, PageHeader, TabLinks } from '@agency-os/ui';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LeadFilters } from '@/components/workspace/lead-filters';
import { Empty } from '@/components/workspace/page-bits';
import { LeadsBoard, LeadsTable } from '@/components/workspace/tables';
import { leads } from '@/lib/data';
import {
  hasLeadFilter,
  leadFilterCookie,
  leadFilterFromQuery,
  leadFilterQuery,
  parseLeadFilter,
} from '@/lib/data/lead-filter';
import { savedViews } from '@/lib/data/saved-views';
import { deleteLeadViewAction, saveLeadViewAction } from './actions';

export const metadata = { title: 'Leads · Agency OS' };

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{
    view?: string;
    source?: string;
    owner?: string;
    due?: string;
    all?: string;
  }>;
}) {
  const [{ workspace }, sp] = await Promise.all([params, searchParams]);
  const { view } = sp;
  const base = `/w/${workspace}/leads`;
  const table = view === 'table';
  const cookie = leadFilterCookie(workspace);
  const filter = parseLeadFilter(sp);
  // Opened without filters: go back to the ones you used last ("Clear filters" adds all=1).
  if (!hasLeadFilter(filter) && !sp.all) {
    const remembered = leadFilterFromQuery(
      decodeURIComponent((await cookies()).get(cookie)?.value ?? ''),
    );
    if (hasLeadFilter(remembered))
      redirect(`${base}?${leadFilterQuery(remembered)}${table ? '&view=table' : ''}`);
  }
  const query = leadFilterQuery(filter);
  const [{ rows, board, total, owners, sources, dueCount }, views] = await Promise.all([
    leads(workspace, filter),
    savedViews('leads', workspace),
  ]);
  const tabHref = (v?: string) => {
    const q = new URLSearchParams(query);
    if (v) q.set('view', v);
    if (sp.all) q.set('all', '1');
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const open = rows.filter((r) => r.stage !== 'Won' && r.stage !== 'Lost');
  const pipeline = open.reduce((sum, r) => sum + r.valueMinor, 0n);
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`${open.length} open · ${formatMoney(pipeline, 'INR', { compact: true })} in the pipeline`}
        actions={
          <>
            <a href={`${base}/export`} className={buttonVariants({})}>
              <DownloadSimple size={16} aria-hidden="true" /> Export CSV
            </a>
            <Link href={`${base}/import`} className={buttonVariants({})}>
              <UploadSimple size={16} aria-hidden="true" /> Import CSV
            </Link>
            <Link href={`${base}/new`} className={buttonVariants({ variant: 'primary' })}>
              <Plus size={16} aria-hidden="true" /> Add lead
            </Link>
          </>
        }
        className="mb-4"
      />
      <TabLinks
        label="Leads view"
        className="mb-4"
        items={[
          { label: 'Board', href: tabHref(), active: !table },
          { label: 'Table', href: tabHref('table'), active: table },
        ]}
      />
      {total > 0 ? (
        <LeadFilters
          base={base}
          table={table}
          filter={filter}
          owners={owners}
          sources={sources}
          dueCount={dueCount}
          views={views}
          cookie={cookie}
          saveAction={saveLeadViewAction.bind(null, workspace, query)}
          deleteAction={deleteLeadViewAction.bind(null, workspace)}
        />
      ) : null}
      {total === 0 ? (
        <Empty
          icon="leads"
          title="No leads yet"
          text="Add your first lead, share your enquiry form, or import a CSV."
        />
      ) : rows.length === 0 ? (
        <Empty
          icon="leads"
          title="No leads match these filters"
          text="Change the source or owner, or clear the filters to see every lead."
          action={
            <Link
              href={`${base}?all=1${table ? '&view=table' : ''}`}
              className={buttonVariants({})}
            >
              Clear filters
            </Link>
          }
        />
      ) : table ? (
        <LeadsTable rows={rows} base={base} />
      ) : (
        <LeadsBoard columns={board} base={base} />
      )}
    </>
  );
}
