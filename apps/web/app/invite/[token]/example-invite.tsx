'use client';

import { Alert, Input } from '@agency-os/ui';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { acceptExampleInviteAction } from './example-actions';

/** Example mode: accept an invite by typing your name (real invites sign in with the email link). */
export function ExampleInvite({
  token,
  workspace,
  role,
}: {
  token: string;
  workspace: string;
  role: string;
}) {
  const [state, action] = useActionState(acceptExampleInviteAction.bind(null, token), EMPTY_FORM);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <h1 className="text-title-md">You’ve been invited to {workspace}</h1>
      <p className="text-body text-muted-foreground">You’ll join as {role}.</p>
      <Alert tone="info" title="Example mode">
        Real invites sign in with the email the invite went to. Here, type a name to accept.
      </Alert>
      <FormMessage state={state} title="Not accepted" />
      <Input
        label="Your name"
        name="name"
        autoComplete="name"
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <Submit size="lg" block>
        Accept invite
      </Submit>
    </form>
  );
}
