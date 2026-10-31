'use client';

import { buttonVariants } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { TaskFields, type ProjectOption } from '@/components/workspace/task-fields';
import { EMPTY_FORM } from '@/lib/form-state';
import { createTaskAction } from '../actions';

export function NewTaskForm({
  slug,
  projects,
  people,
  defaults,
}: {
  slug: string;
  projects: ProjectOption[];
  people: string[];
  defaults: { projectId?: string };
}) {
  const [state, action] = useActionState(createTaskAction.bind(null, slug), EMPTY_FORM);
  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} title="The task wasn’t added" />
      <TaskFields
        projects={projects}
        people={people}
        values={state.values ?? { projectId: defaults.projectId ?? '' }}
        errors={state.errors ?? {}}
      />
      <div className="flex justify-end gap-2">
        <Link href={`/w/${slug}/tasks`} className={buttonVariants({ variant: 'secondary' })}>
          Cancel
        </Link>
        <Submit>Add task</Submit>
      </div>
    </form>
  );
}
