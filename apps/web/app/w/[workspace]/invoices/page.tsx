import { Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { Empty } from '@/components/workspace/page-bits';
import { InvoicesTable } from '@/components/workspace/tables';
import { invoices } from '@/lib/data';

export const metadata = { title: 'Invoices · Agency OS' };

export default async function InvoicesPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const base = `/w/${workspace}/invoices`;
  const rows = await invoices();
  const overdue = rows.filter((i) => i.status === 'overdue').length;
  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${rows.length} this financial year · ${overdue} overdue`}
        actions={
          <Link href={`${base}/new`} className={buttonVariants({ variant: 'primary' })}>
            <Plus size={16} aria-hidden="true" /> New invoice
          </Link>
        }
        className="mb-4"
      />
      {rows.length === 0 ? (
        <Empty
          icon="invoices"
          title="No invoices yet"
          text="Bill a milestone or create an invoice from a quote."
        />
      ) : (
        <InvoicesTable rows={rows} base={base} />
      )}
    </>
  );
}
