import { PageHeader } from '@agency-os/ui';
import { ImportWizard } from './import-wizard';

export const metadata = { title: 'Import leads · Agency OS' };

export default async function ImportLeadsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Import leads" subtitle="Bring leads in from a spreadsheet." />
      <ImportWizard slug={workspace} />
    </div>
  );
}
