'use client';

import { Alert, Button } from '@agency-os/ui';
import { useActionState } from 'react';
import { acceptInvite, type AcceptState } from './actions';

export function AcceptForm({ token, email }: { token: string; email?: string | null }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInvite, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <h1 className="text-title-md">You’re invited to join a workspace</h1>
        <p className="text-body text-muted-foreground">
          {email ? `You’re signed in as ${email}. ` : ''}Accept to see the team’s work.
        </p>
      </div>
      {state.error ? (
        <Alert tone="danger" title="The invite wasn’t accepted">
          {state.error}
        </Alert>
      ) : null}
      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        Accept invite
      </Button>
    </form>
  );
}
