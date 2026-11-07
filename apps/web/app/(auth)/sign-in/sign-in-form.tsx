'use client';

import { Envelope, GoogleLogo } from '@phosphor-icons/react';
import { Alert, Button, Input } from '@agency-os/ui';
import { useActionState } from 'react';
import { sendMagicLink, signInWithGoogle, type SignInState } from './actions';

const LINK_ERRORS: Record<string, { title: string; body: string }> = {
  link: {
    title: 'This sign-in link has expired',
    body: 'Links work once and for a short time. Send a new one below.',
  },
  google: {
    title: 'Google sign-in didn’t finish',
    body: 'Try again, or use an email link instead.',
  },
};

export function SignInForm({
  next,
  linkError,
  googleEnabled,
}: {
  next: string;
  linkError?: string;
  googleEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(sendMagicLink, {});
  const banner = linkError ? LINK_ERRORS[linkError] : undefined;

  if (state.sentTo) {
    return (
      <div className="grid gap-2">
        <h1 className="text-title-md">Check your email</h1>
        <p className="text-body text-muted-foreground" role="status">
          We sent a sign-in link to {state.sentTo}. Open it on this device.
        </p>
        <form action={action}>
          <input type="hidden" name="email" value={state.sentTo} />
          <input type="hidden" name="next" value={next} />
          <Button variant="link" type="submit" loading={pending}>
            Send it again
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-title-md">Sign in or create an account</h1>
        <p className="text-body text-muted-foreground">
          Run your agency from lead to paid invoice.
        </p>
      </div>
      {banner ? (
        <Alert tone="danger" title={banner.title}>
          {banner.body}
        </Alert>
      ) : null}
      {googleEnabled ? (
        <>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" icon={GoogleLogo} size="lg" block>
              Continue with Google
            </Button>
          </form>
          <div className="flex items-center gap-3 text-caption text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
      <form action={action} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@agency.in"
          required
          error={state.error}
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
