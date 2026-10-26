import { CalendarBlank, FolderSimple, UsersThree } from '@phosphor-icons/react/dist/ssr';
import { Card, RecordHeader, type BadgeProps } from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activities } from '@/components/workspace/activity';
import { Submit } from '@/components/workspace/form-bits';
import { PEOPLE } from '@/lib/data';
import { phaseNames } from '@/lib/data/project-phases';
import { getTask, projectOptions } from '@/lib/data/tasks';
import { TASK_STATUSES } from '@/lib/data/types';
import { setStatusAction } from '../actions';
import { CommentForm, Subtasks, TaskEditForm } from './task-panels';

const TONE: Record<string, BadgeProps['tone']> = {
  todo: 'neutral',
  in_progress: 'info',
  in_review: 'brand',
  done: 'success',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await getTask((await params).id);
  return { title: `${found?.task.title ?? 'Task'} · Agency OS` };
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const found = await getTask(id);
  if (!found) notFound();
  const { task, project, client, due } = found;
  const projects = (await projectOptions()).map((p) => ({
    id: p.id,
    name: p.name,
    phases: phaseNames(p.template),
  }));
  const status = TASK_STATUSES.find((s) => s.id === task.status)!;

  return (
    <div className="grid gap-6">
      <Link href={`/w/${workspace}/tasks`} className="text-body-sm text-muted-foreground">
        ← All tasks
      </Link>
      <RecordHeader
        title={task.title}
        status={status.name}
        statusTone={TONE[task.status]}
        meta={[
          {
            icon: FolderSimple,
            text: (
              <Link href={`/w/${workspace}/projects/${project.id}`}>
                {client.name} · {project.name}
                {task.phase ? ` · ${task.phase}` : ''}
              </Link>
            ),
          },
          { icon: UsersThree, text: task.assignee },
          {
            icon: CalendarBlank,
            text: <span className={due.overdue ? 'text-danger' : undefined}>{due.text}</span>,
          },
        ]}
        actions={
          <form action={setStatusAction.bind(null, workspace, task.id)}>
            {task.status === 'done' ? (
              <Submit variant="secondary" name="status" value="in_progress">
                Reopen task
              </Submit>
            ) : (
              <Submit name="status" value="done">
                Mark done
              </Submit>
            )}
          </form>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card title="Details">
            <TaskEditForm
              slug={workspace}
              id={task.id}
              projects={projects}
              people={PEOPLE}
              values={{
                title: task.title,
                projectId: task.projectId,
                phase: task.phase ?? '',
                assignee: task.assignee,
                dueOn: task.dueOn ?? '',
                priority: task.priority,
                status: task.status,
                description: task.description,
              }}
            />
          </Card>
        </div>
        <div className="grid content-start gap-4">
          <Card title="Subtasks">
            <Subtasks slug={workspace} id={task.id} items={task.subtasks} />
          </Card>
          <Card title="Comments">
            <div className="grid gap-4">
              <Activities
                items={[...task.comments].reverse().map((c) => ({
                  id: c.id,
                  kind: 'note' as const,
                  who: c.who,
                  text: c.text,
                  at: c.at,
                }))}
                empty="No comments yet."
                raw
              />
              <CommentForm slug={workspace} id={task.id} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
