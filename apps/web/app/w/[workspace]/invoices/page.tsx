import { PageHeader } from '@agency-os/ui';
import { Empty } from '@/components/workspace/page-bits';
import { InvoicesTable } from '@/components/workspace/tables';
import { invoices } from '@/lib/data';

export const metadata = { title: 'Invoices · Agency OS' };

export default async function InvoicesPage() {
  const rows = await invoices();
  const overdue = rows.filter((i) => i.status === 'overdue').length;
  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${rows.length} this financial year · ${overdue} overdue`}
        className="mb-4"
      />
      {rows.length === 0 ? (
        <Empty
          icon="invoices"
          title="No invoices yet"
          text="Bill a milestone or create an invoice from a quote."
        />
      ) : (
        <InvoicesTable rows={rows} />
      )}
    </>
  );
}
