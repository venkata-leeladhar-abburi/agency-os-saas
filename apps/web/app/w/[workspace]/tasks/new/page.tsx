import { PageHeader } from '@agency-os/ui';
import { people } from '@/lib/data';
import { phaseNames } from '@/lib/data/project-phases';
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
  const projects = (await projectOptions()).map((p) => ({
    id: p.id,
    name: p.name,
    phases: phaseNames(p.template),
  }));
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="New task" subtitle="What needs doing, who does it and by when." />
      <NewTaskForm
        slug={workspace}
        projects={projects}
        people={await people()}
        defaults={{ projectId: projects.some((p) => p.id === project) ? project : undefined }}
      />
    </div>
  );
}
