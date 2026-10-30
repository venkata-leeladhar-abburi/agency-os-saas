import { Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader, TabLinks } from '@agency-os/ui';
import Link from 'next/link';
import { Empty } from '@/components/workspace/page-bits';
import { TaskBoard, TasksTable } from '@/components/workspace/tables';
import { TaskCalendar } from '@/components/workspace/task-calendar';
import { istDate } from '@/lib/data/views';
import { member, myName } from '@/lib/data/team';
import { tasks } from '@/lib/data/tasks';

export const metadata = { title: 'Tasks · Agency OS' };

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ view?: string; who?: string; month?: string }>;
}) {
  const [{ workspace }, { view, who, month: monthParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const base = `/w/${workspace}/tasks`;
  const mine = who === 'me';
  // ?who=<member id> from the dashboard's team load: one person's tasks.
  const person = !mine && who ? await member(who, workspace) : null;
  const assignee = mine ? await myName(workspace) : person?.name;
  const rows = await tasks(assignee ? { assignee } : {}, workspace);
  const open = rows.filter((t) => t.status !== 'Done');
  const overdue = rows.filter((t) => t.overdue).length;
  const q = (v: string | undefined, w: boolean, month?: string) =>
    `${base}?${new URLSearchParams({ ...(v ? { view: v } : {}), ...(w ? { who: 'me' } : {}), ...(month ? { month } : {}) })}`;
  const today = istDate(new Date());
  const month =
    monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const tab = view === 'table' || view === 'calendar' ? view : 'board';
  return (
    <>
      <PageHeader
        title={mine ? 'My tasks' : person ? `Tasks for ${person.name}` : 'Tasks'}
        subtitle={`${open.length} open · ${overdue} overdue`}
        actions={
          <Link href={`${base}/new`} className={buttonVariants({ variant: 'primary' })}>
            <Plus size={16} aria-hidden="true" /> Add task
          </Link>
        }
        className="mb-4"
      />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <TabLinks
          label="Tasks view"
          items={[
            { label: 'Board', href: q(undefined, mine), active: tab === 'board' },
            { label: 'Table', href: q('table', mine), active: tab === 'table' },
            { label: 'Calendar', href: q('calendar', mine), active: tab === 'calendar' },
          ]}
        />
        <TabLinks
          label="Whose tasks"
          items={[
            { label: 'Everyone', href: q(view, false), active: !mine && !person },
            { label: 'Mine', href: q(view, true), active: mine },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <Empty
          icon="tasks"
          title={
            mine
              ? 'Nothing assigned to you'
              : person
                ? `Nothing assigned to ${person.name}`
                : 'No tasks yet'
          }
          text="Add tasks to a project phase to plan the work."
        />
      ) : tab === 'table' ? (
        <TasksTable rows={rows} base={base} />
      ) : tab === 'calendar' ? (
        <TaskCalendar
          rows={rows}
          base={base}
          month={month}
          today={today}
          link={(m) => q('calendar', mine, m)}
        />
      ) : (
        <TaskBoard rows={rows} base={base} />
      )}
    </>
  );
}
