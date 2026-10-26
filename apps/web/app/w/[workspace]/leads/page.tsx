import { DownloadSimple, Plus, UploadSimple } from '@phosphor-icons/react/dist/ssr';
import { formatMoney } from '@agency-os/core';
import { buttonVariants, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { Empty, ViewTabs } from '@/components/workspace/page-bits';
import { LeadsBoard, LeadsTable } from '@/components/workspace/tables';
import { leads } from '@/lib/data';

export const metadata = { title: 'Leads · Agency OS' };

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ workspace }, { view }] = await Promise.all([params, searchParams]);
  const base = `/w/${workspace}/leads`;
  const { rows, board } = await leads();
  const open = rows.filter((r) => r.stage !== 'Won' && r.stage !== 'Lost');
  const total = open.reduce((sum, r) => sum + r.valueMinor, 0n);
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`${open.length} open · ${formatMoney(total, 'INR', { compact: true })} in the pipeline`}
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
      <ViewTabs base={base} view={view === 'table' ? 'table' : 'board'} label="Leads view" />
      {rows.length === 0 ? (
        <Empty
          icon="leads"
          title="No leads yet"
          text="Add your first lead, share your enquiry form, or import a CSV."
        />
      ) : view === 'table' ? (
        <LeadsTable rows={rows} base={base} />
      ) : (
        <LeadsBoard columns={board} base={base} />
      )}
    </>
  );
}
