import { PageHeader } from '@agency-os/ui';
import { people } from '@/lib/data';
import { projectOptions } from '@/lib/data/tasks';
import { NewTaskForm } from './new-task-form';

export const metadata = { title: 'New task · Agency OS' };

export default async function NewTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ project?: string }>;
}) {
  const [{ workspace }, { project }] = await Promise.all([params, searchParams]);
  const projects = (await projectOptions(workspace)).map((p) => ({
    id: p.id,
    name: p.name,
    phases: p.phases,
  }));
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="New task" subtitle="What needs doing, who does it and by when." />
      <NewTaskForm
        slug={workspace}
        projects={projects}
        people={await people(workspace)}
        defaults={{ projectId: projects.some((p) => p.id === project) ? project : undefined }}
      />
    </div>
  );
}
