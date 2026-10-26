import { PageHeader } from '@agency-os/ui';
import { Empty } from '@/components/workspace/page-bits';
import { ClientsTable } from '@/components/workspace/tables';
import { clients } from '@/lib/data';

export const metadata = { title: 'Clients · Agency OS' };

export default async function ClientsPage() {
  const rows = await clients();
  return (
    <>
      <PageHeader title="Clients" subtitle={`${rows.length} clients`} className="mb-4" />
      {rows.length === 0 ? (
        <Empty
          icon="clients"
          title="No clients yet"
          text="Win a lead or add a client you already work with."
        />
      ) : (
        <ClientsTable rows={rows} />
      )}
    </>
  );
}
