'use client';

import { Alert, Input, Select } from '@agency-os/ui';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { saveContactAction } from '../actions';

export function AccountForm({
  slug,
  values,
}: {
  slug: string;
  values: { name: string; email: string; phone: string };
}) {
  const [state, action] = useActionState(saveContactAction.bind(null, slug), EMPTY_FORM);
  const v = state.values ?? values;
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} title="Not saved" />
      {state.done ? <Alert tone="success" title="Saved" /> : null}
      <Input
        label="Name"
        name="name"
        size="xl"
        autoComplete="name"
        defaultValue={v.name}
        error={e.name}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        size="xl"
        autoComplete="email"
        defaultValue={v.email}
        error={e.email}
        hint="Your sign-in link and invoices go here."
      />
      <Input
        label="Phone"
        name="phone"
        type="tel"
        size="xl"
        optional
        autoComplete="tel"
        defaultValue={v.phone}
        error={e.phone}
      />
      <Select
        label="Language"
        size="xl"
        options={['English', 'हिन्दी (coming later)', 'తెలుగు (coming later)']}
        defaultValue="English"
        disabled
        hint="Hindi and Telugu come after launch."
      />
      <Submit size="xl" block>
        Save
      </Submit>
    </form>
  );
}
