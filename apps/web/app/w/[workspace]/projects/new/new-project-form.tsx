'use client';

import { Badge, buttonVariants, Input, Select } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { createProjectAction } from '../actions';

const TEMPLATES = [
  {
    value: 'seven_phases',
    name: 'Seven phases',
    text: 'Connect, Discover, Define, Design, Build, Launch, Grow, with client sign-offs.',
    tag: 'Default',
  },
  { value: 'blank', name: 'Blank', text: 'One phase, no sign-offs. Add your own.' },
];

export function NewProjectForm({
  slug,
  clients,
  people,
  defaults,
}: {
  slug: string;
  clients: { id: string; name: string }[];
  people: string[];
  defaults: { clientId?: string; startOn: string; dueOn: string };
}) {
  const [state, action] = useActionState(createProjectAction.bind(null, slug), EMPTY_FORM);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} title="The project wasn’t created" />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-title-sm">Template</legend>
        {TEMPLATES.map((t) => (
          <label
            key={t.value}
            className="grid cursor-pointer gap-1 rounded-lg border border-border bg-card p-4 has-checked:border-2 has-checked:border-primary"
          >
            <span className="flex items-center gap-2 text-body font-semibold">
              <input
                type="radio"
                name="template"
                value={t.value}
                defaultChecked={(v.template ?? 'seven_phases') === t.value}
                className="accent-(--primary)"
              />
              {t.name}
              {t.tag ? (
                <Badge size="sm" tone="brand">
                  {t.tag}
                </Badge>
              ) : null}
            </span>
            <span className="text-body-sm text-muted-foreground">{t.text}</span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Project name"
          name="name"
          required
          placeholder="e.g. Kite & Co website"
          defaultValue={v.name}
          error={e.name}
        />
        <Select
          label="Client"
          name="clientId"
          required
          placeholder="Choose a client"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={v.clientId ?? defaults.clientId ?? ''}
          error={e.clientId}
        />
        <Select
          label="Project lead"
          name="lead"
          options={people}
          defaultValue={v.lead ?? people[1] ?? people[0]}
          error={e.lead}
        />
        <Input
          label="Budget"
          name="budget"
          prefix="₹"
          inputMode="numeric"
          optional
          placeholder="e.g. 80,000"
          defaultValue={v.budget}
          error={e.budget}
        />
        <Input
          label="Start"
          name="startOn"
          type="date"
          defaultValue={v.startOn ?? defaults.startOn}
          error={e.startOn}
        />
        <Input
          label="Due"
          name="dueOn"
          type="date"
          defaultValue={v.dueOn ?? defaults.dueOn}
          error={e.dueOn}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Link href={`/w/${slug}/projects`} className={buttonVariants({ variant: 'secondary' })}>
          Cancel
        </Link>
        <Submit>Create project</Submit>
      </div>
    </form>
  );
}
