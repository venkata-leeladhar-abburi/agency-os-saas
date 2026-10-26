import { PageHeader } from '@agency-os/ui';
import { Empty, ViewTabs } from '@/components/workspace/page-bits';
import { TaskBoard, TasksTable } from '@/components/workspace/tables';
import { tasks } from '@/lib/data';

export const metadata = { title: 'Tasks · Agency OS' };

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ workspace }, { view }] = await Promise.all([params, searchParams]);
  const rows = await tasks();
  const overdue = rows.filter((t) => t.overdue).length;
  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle={`${rows.length} tasks · ${overdue} overdue`}
        className="mb-4"
      />
      <ViewTabs
        base={`/w/${workspace}/tasks`}
        view={view === 'table' ? 'table' : 'board'}
        label="Tasks view"
      />
      {rows.length === 0 ? (
        <Empty
          icon="tasks"
          title="No tasks yet"
          text="Add tasks to a project phase to plan the work."
        />
      ) : view === 'table' ? (
        <TasksTable rows={rows} />
      ) : (
        <TaskBoard rows={rows} />
      )}
    </>
  );
}
