'use client';

import { Alert, Button, Input, Select } from '@agency-os/ui';
import { useActionState } from 'react';
import { setUpWorkspace, type SetupState } from './actions';

export function SetupForm({ countries }: { countries: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(setUpWorkspace, {});
  return (
    <form action={action} className="grid gap-4">
      <p className="text-overline-caps text-muted-foreground">Step 1 of 1</p>
      <div>
        <h1 className="text-title-md">Name your workspace</h1>
        <p className="text-body text-muted-foreground">
          This is your agency’s home in Agency OS. You can change it later in Settings.
        </p>
      </div>
      {state.error && !state.name ? <Alert tone="danger">{state.error}</Alert> : null}
      <Input
        label="Workspace name"
        name="name"
        required
        autoComplete="organization"
        placeholder="One Stop Solutions"
        defaultValue={state.name}
        error={state.name !== undefined ? state.error : undefined}
      />
      <Select
        label="Country"
        name="country"
        options={countries}
        defaultValue={state.country ?? 'IN'}
        hint="Sets your currency, number format and time zone. India uses ₹ and IST."
      />
      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        Create workspace
      </Button>
    </form>
  );
}
