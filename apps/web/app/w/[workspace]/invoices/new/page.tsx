import { PageHeader } from '@agency-os/ui';
import { clientOptions, nextInvoiceNumber, settings } from '@/lib/data';
import { istDateIn } from '@/lib/data/views';
import { InvoiceEditor } from './invoice-editor';

export const metadata = { title: 'New invoice · Agency OS' };

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const [{ workspace }, { client }] = await Promise.all([params, searchParams]);
  const [options, s, nextNumber] = await Promise.all([
    clientOptions(workspace),
    settings(workspace),
    nextInvoiceNumber(workspace),
  ]);
  const clients = options;
  return (
    <>
      <PageHeader
        title="New invoice"
        subtitle={`Number ${nextNumber} is given when you issue it`}
        className="mb-4"
      />
      <InvoiceEditor
        slug={workspace}
        clients={clients}
        settings={{ stateCode: s.stateCode, lutArn: s.lutArn }}
        nextNumber={nextNumber}
        defaults={{
          clientId: options.some((o) => o.id === client) ? client : undefined,
          dueOn: istDateIn(s.paymentTermsDays),
        }}
      />
    </>
  );
}
