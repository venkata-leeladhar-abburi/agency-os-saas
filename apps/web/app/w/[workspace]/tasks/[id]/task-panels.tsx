'use client';

import { Alert, Checkbox, Input, Textarea } from '@agency-os/ui';
import { useActionState, useEffect, useRef, useTransition } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import { TaskFields, type ProjectOption } from '@/components/workspace/task-fields';
import { EMPTY_FORM, type FormState } from '@/lib/form-state';
import type { Fields } from '@/lib/forms';
import {
  addCommentAction,
  addSubtaskAction,
  toggleSubtaskAction,
  updateTaskAction,
} from '../actions';

export function TaskEditForm({
  slug,
  id,
  projects,
  people,
  values,
}: {
  slug: string;
  id: string;
  projects: ProjectOption[];
  people: string[];
  values: Fields;
}) {
  const [state, action] = useActionState(updateTaskAction.bind(null, slug, id), EMPTY_FORM);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <TaskFields
        projects={projects}
        people={people}
        values={state.values ?? values}
        errors={state.errors ?? {}}
      />
      <div className="flex items-center justify-end gap-3">
        {state.done ? (
          <p role="status" className="text-body-sm text-muted-foreground">
            Task saved.
          </p>
        ) : null}
        <Submit variant="secondary">Save changes</Submit>
      </div>
    </form>
  );
}

export function Subtasks({
  slug,
  id,
  items,
}: {
  slug: string;
  id: string;
  items: { id: string; title: string; done: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState(addSubtaskAction.bind(null, slug, id), EMPTY_FORM);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);
  return (
    <div className="grid gap-3">
      {items.length ? (
        <fieldset className="grid gap-2" disabled={pending}>
          <legend className="sr-only">Subtasks</legend>
          {items.map((s) => (
            <Checkbox
              key={s.id}
              label={s.title}
              checked={s.done}
              onCheckedChange={(v) =>
                startTransition(() => toggleSubtaskAction(slug, id, s.id, v === true))
              }
            />
          ))}
        </fieldset>
      ) : (
        <p className="text-body-sm text-muted-foreground">No subtasks yet.</p>
      )}
      <form ref={form} action={action} className="flex items-end gap-2">
        <Input
          label="New subtask"
          name="title"
          placeholder="e.g. Telugu translation"
          error={state.errors?.title}
          containerClassName="flex-1"
        />
        <Submit variant="secondary">Add</Submit>
      </form>
    </div>
  );
}

export function CommentForm({ slug, id }: { slug: string; id: string }) {
  const [state, action] = useActionState<FormState & { mentioned?: string[] }, FormData>(
    addCommentAction.bind(null, slug, id),
    EMPTY_FORM,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);
  return (
    <form ref={form} action={action} className="grid gap-2">
      <Textarea
        label="Comment"
        name="text"
        rows={2}
        placeholder="Write a comment"
        hint="Type @ and a name, like @Ananya Iyer, to notify them."
        defaultValue={state.values?.text}
        error={state.errors?.text}
      />
      {state.mentioned?.length ? (
        <Alert tone="success" title={`${state.mentioned.join(' and ')} will be notified`} />
      ) : null}
      <div>
        <Submit variant="secondary" size="sm">
          Add comment
        </Submit>
      </div>
    </form>
  );
}
