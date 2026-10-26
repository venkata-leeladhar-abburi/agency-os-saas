'use client';

import { Input, Select, Textarea } from '@agency-os/ui';
import { useState } from 'react';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/data/types';
import type { Errors, Fields } from '@/lib/forms';

export type ProjectOption = { id: string; name: string; phases: string[] };

/** The fields a task has, shared by the new-task form and task detail. */
export function TaskFields({
  projects,
  people,
  values,
  errors,
  withTitle = true,
}: {
  projects: ProjectOption[];
  people: string[];
  values: Fields;
  errors: Errors;
  withTitle?: boolean;
}) {
  const [projectId, setProjectId] = useState(values.projectId ?? '');
  const phases = projects.find((p) => p.id === projectId)?.phases ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withTitle ? (
        <Input
          label="Task"
          name="title"
          required
          placeholder="e.g. Homepage hero copy"
          defaultValue={values.title}
          error={errors.title}
          containerClassName="sm:col-span-2"
        />
      ) : (
        <input type="hidden" name="title" value={values.title} />
      )}
      <Select
        label="Project"
        name="projectId"
        required
        placeholder="Choose a project"
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        error={errors.projectId}
      />
      <Select
        key={projectId}
        label="Phase"
        name="phase"
        optional
        placeholder="No phase"
        options={phases}
        defaultValue={phases.includes(values.phase ?? '') ? values.phase : ''}
      />
      <Select
        label="Assignee"
        name="assignee"
        options={people}
        defaultValue={values.assignee ?? people[0]}
        error={errors.assignee}
      />
      <Input
        label="Due"
        name="dueOn"
        type="date"
        defaultValue={values.dueOn}
        error={errors.dueOn}
      />
      <Select
        label="Priority"
        name="priority"
        options={TASK_PRIORITIES.map((p) => ({ value: p.id, label: p.name }))}
        defaultValue={values.priority ?? 'normal'}
      />
      <Select
        label="Status"
        name="status"
        options={TASK_STATUSES.map((s) => ({ value: s.id, label: s.name }))}
        defaultValue={values.status ?? 'todo'}
      />
      <Textarea
        label="Description"
        name="description"
        optional
        rows={3}
        defaultValue={values.description}
        containerClassName="sm:col-span-2"
      />
    </div>
  );
}
