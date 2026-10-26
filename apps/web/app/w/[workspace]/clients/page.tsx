import { Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { Empty } from '@/components/workspace/page-bits';
import { ClientsTable } from '@/components/workspace/tables';
import { clients } from '@/lib/data';

export const metadata = { title: 'Clients · Agency OS' };

export default async function ClientsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const base = `/w/${workspace}/clients`;
  const rows = await clients();
  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${rows.length} ${rows.length === 1 ? 'client' : 'clients'}`}
        actions={
          <Link href={`${base}/new`} className={buttonVariants({ variant: 'primary' })}>
            <Plus size={16} aria-hidden="true" /> Add client
          </Link>
        }
        className="mb-4"
      />
      {rows.length === 0 ? (
        <Empty
          icon="clients"
          title="No clients yet"
          text="Win a lead or add a client you already work with."
        />
      ) : (
        <ClientsTable rows={rows} base={base} />
      )}
    </>
  );
}
