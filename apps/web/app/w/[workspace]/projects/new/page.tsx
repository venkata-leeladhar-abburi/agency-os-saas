import { PageHeader } from '@agency-os/ui';
import { clientOptions, people } from '@/lib/data';
import { istDateIn } from '@/lib/data/views';
import { NewProjectForm } from './new-project-form';

export const metadata = { title: 'New project · Agency OS' };

export default async function NewProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const [{ workspace }, { client }] = await Promise.all([params, searchParams]);
  const clients = await clientOptions();
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader
        title="New project"
        subtitle="Start from your usual process. You can change phases later."
      />
      <NewProjectForm
        slug={workspace}
        clients={clients}
        people={await people()}
        defaults={{
          clientId: clients.some((c) => c.id === client) ? client : undefined,
          startOn: istDateIn(0),
          dueOn: istDateIn(56),
        }}
      />
    </div>
  );
}
