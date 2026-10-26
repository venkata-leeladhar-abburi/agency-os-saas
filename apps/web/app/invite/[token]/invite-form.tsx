'use client';

import { Alert, Button, Input } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { acceptInvite, type InviteState } from './actions';

export function InviteForm({ token, email }: { token: string; email?: string | null }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(acceptInvite, {});

  if (state.code === 'already_member')
    return (
      <div className="grid gap-3">
        <h1 className="text-title-md">You’re already in this workspace</h1>
        <p className="text-body text-muted-foreground">Open the workspace to carry on.</p>
        <Button variant="primary" asChild>
          <Link href="/app">Open workspace</Link>
        </Button>
      </div>
    );

  if (state.code && state.code !== 'invite_wrong_email')
    return (
      <div className="grid gap-3" role="alert">
        <h1 className="text-title-md">This invite doesn’t work</h1>
        <p className="text-body text-muted-foreground">{state.error}</p>
      </div>
    );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <h1 className="text-title-md">You’ve been invited to a workspace</h1>
        <p className="text-body text-muted-foreground">
          {email ? `You’re signed in as ${email}. ` : ''}Add your name, then accept to join.
        </p>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Input label="Your name" name="name" autoComplete="name" required />
      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        Accept invite
      </Button>
    </form>
  );
}
