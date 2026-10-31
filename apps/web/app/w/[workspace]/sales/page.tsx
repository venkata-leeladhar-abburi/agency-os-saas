import { Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { Empty } from '@/components/workspace/page-bits';
import { SalesTable } from '@/components/workspace/sales-table';
import { salesDocs } from '@/lib/data/sales';

export const metadata = { title: 'Sales docs · Agency OS' };

export default async function SalesPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const rows = await salesDocs(workspace);
  const waiting = rows.filter((r) => r.statusKey === 'sent' || r.statusKey === 'viewed').length;
  return (
    <>
      <PageHeader
        title="Sales docs"
        subtitle={`${rows.length} quotes and proposals · ${waiting} waiting for the client`}
        actions={
          <Link
            href={`/w/${workspace}/sales/quotes/new`}
            className={buttonVariants({ variant: 'primary' })}
          >
            <Plus size={16} aria-hidden="true" /> New quote
          </Link>
        }
        className="mb-4"
      />
      {rows.length === 0 ? (
        <Empty
          icon="sales"
          title="No quotes yet"
          text="Price the work for a lead, then turn the quote into a proposal they can sign."
        />
      ) : (
        <SalesTable rows={rows} />
      )}
    </>
  );
}
