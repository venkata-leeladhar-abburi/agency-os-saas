import { formatMoney } from '@agency-os/core';
import { PageHeader } from '@agency-os/ui';
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
  const { rows, board } = await leads();
  const open = rows.filter((r) => r.stage !== 'Won' && r.stage !== 'Lost');
  const total = open.reduce((sum, r) => sum + r.valueMinor, 0n);
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`${open.length} open · ${formatMoney(total, 'INR', { compact: true })} in the pipeline`}
        className="mb-4"
      />
      <ViewTabs
        base={`/w/${workspace}/leads`}
        view={view === 'table' ? 'table' : 'board'}
        label="Leads view"
      />
      {rows.length === 0 ? (
        <Empty
          icon="leads"
          title="No leads yet"
          text="Add your first lead, share your enquiry form, or import a CSV."
        />
      ) : view === 'table' ? (
        <LeadsTable rows={rows} />
      ) : (
        <LeadsBoard columns={board} />
      )}
    </>
  );
}
