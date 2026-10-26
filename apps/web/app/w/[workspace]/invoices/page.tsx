import { Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader, TabLinks } from '@agency-os/ui';
import Link from 'next/link';
import { Empty } from '@/components/workspace/page-bits';
import { InvoicesTable } from '@/components/workspace/tables';
import { invoices } from '@/lib/data';
import { filterInvoices, INVOICE_FILTERS, parseInvoiceFilter } from '@/lib/invoice-filters';

export const metadata = { title: 'Invoices · Agency OS' };

const EMPTY: Record<string, string> = {
  due: 'Nothing waiting to be paid.',
  overdue: 'Nothing overdue.',
  paid: 'No paid invoices yet.',
  draft: 'No drafts.',
  received: 'No payments this month yet.',
};

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ workspace }, { status }] = await Promise.all([params, searchParams]);
  const base = `/w/${workspace}/invoices`;
  const all = await invoices();
  const filter = parseInvoiceFilter(status);
  const rows = filterInvoices(all, filter);
  const overdue = all.filter((i) => i.status === 'overdue').length;
  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${all.length} this financial year · ${overdue} overdue`}
        actions={
          <Link href={`${base}/new`} className={buttonVariants({ variant: 'primary' })}>
            <Plus size={16} aria-hidden="true" /> New invoice
          </Link>
        }
        className="mb-4"
      />
      {all.length === 0 ? (
        <Empty
          icon="invoices"
          title="No invoices yet"
          text="Bill a milestone or create an invoice from a quote."
        />
      ) : (
        <>
          <TabLinks
            label="Invoice status"
            className="mb-4"
            items={INVOICE_FILTERS.map((f) => ({
              label: f.label,
              href: f.id === 'all' ? base : `${base}?status=${f.id}`,
              active: f.id === filter,
            }))}
          />
          {filter === 'received' ? (
            <p className="mb-3 text-body text-muted-foreground">
              Invoices with a payment this month. <Link href={base}>Show all invoices</Link>
            </p>
          ) : null}
          {rows.length ? (
            <InvoicesTable rows={rows} base={base} />
          ) : (
            <p className="text-body text-muted-foreground">{EMPTY[filter]}</p>
          )}
        </>
      )}
    </>
  );
}
