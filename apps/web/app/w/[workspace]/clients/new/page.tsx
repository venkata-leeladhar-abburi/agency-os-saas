import { PageHeader } from '@agency-os/ui';
import { NewClientForm } from './new-client-form';

export const metadata = { title: 'New client · Agency OS' };

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="New client" subtitle="Who you bill and who you talk to." />
      <NewClientForm slug={workspace} />
    </div>
  );
}
