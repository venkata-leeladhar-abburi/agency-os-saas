'use client';

import { Button, Input } from '@agency-os/ui';
import { useActionState } from 'react';
import { signOutAction, verifyCodeAction, type CodeState } from './actions';

export function CodeForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<CodeState, FormData>(verifyCodeAction, {});
  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Input
          label="Code from your authenticator app"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          size="xl"
          required
          error={state.error}
        />
        <Button type="submit" variant="primary" size="lg" block loading={pending}>
          Continue
        </Button>
      </form>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="lg" block>
          Sign out
        </Button>
      </form>
      <p className="text-body-sm text-muted-foreground">
        Lost your phone? Contact Agency OS support from the email you sign in with.
      </p>
    </div>
  );
}
