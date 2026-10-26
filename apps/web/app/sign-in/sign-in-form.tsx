'use client';

import { Envelope, GoogleLogo } from '@phosphor-icons/react';
import { Alert, Button, Input } from '@agency-os/ui';
import { useActionState } from 'react';
import { emailLink, googleSignIn, type SignInState } from './actions';

const NOTICES: Record<string, { title: string; body: string }> = {
  link: {
    title: 'This sign-in link has expired',
    body: 'Links work for 10 minutes and only in the browser you asked from. Send a new one below.',
  },
  google: {
    title: 'Google sign-in isn’t available yet',
    body: 'Use the email link below instead.',
  },
  setup: {
    title: 'Sign-in isn’t set up on this server yet',
    body: 'Ask the owner to add the Supabase keys.',
  },
};

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(emailLink, {
    status: 'idle',
  });

  if (state.status === 'sent')
    return (
      <div className="grid gap-3" role="status">
        <h1 className="text-title-md">Check your email</h1>
        <p className="text-body text-muted-foreground">
          We sent a sign-in link to {state.email}. It works for 10 minutes.
        </p>
        <form action={action} className="grid">
          <input type="hidden" name="email" value={state.email} />
          <input type="hidden" name="next" value={next} />
          <Button variant="link" type="submit" loading={pending} className="justify-self-start">
            Send it again
          </Button>
        </form>
      </div>
    );

  const shown = notice ? NOTICES[notice] : undefined;
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-title-md">Sign in or create an account</h1>
        <p className="text-body text-muted-foreground">
          Run your agency from lead to paid invoice.
        </p>
      </div>
      {shown ? (
        <Alert tone="danger" title={shown.title}>
          {shown.body}
        </Alert>
      ) : null}
      <form action={googleSignIn} className="grid">
        <input type="hidden" name="next" value={next} />
        <Button type="submit" icon={GoogleLogo} size="lg" block>
          Continue with Google
        </Button>
      </form>
      <div
        className="flex items-center gap-3 text-caption text-muted-foreground"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@agency.in"
          defaultValue={state.email}
          error={state.status === 'error' ? state.error : undefined}
          required
        />
        <Button type="submit" variant="primary" size="lg" block icon={Envelope} loading={pending}>
          Email me a sign-in link
        </Button>
      </form>
      <p className="text-caption font-normal text-muted-foreground">
        By continuing you agree to the terms and privacy policy.
      </p>
    </div>
  );
}
