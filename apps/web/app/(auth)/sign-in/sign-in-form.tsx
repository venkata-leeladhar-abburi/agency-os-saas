'use client';

import { Envelope, GoogleLogo, Phone } from '@phosphor-icons/react';
import { Alert, Button, Input } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import {
  sendEmailLink,
  sendPhoneCode,
  signInWithGoogle,
  verifyPhoneCode,
  type SignInState,
} from './actions';

const start: SignInState = { step: 'start' };

export function SignInForm({
  next,
  initialError,
  phoneEnabled,
  signedOutEverywhere = false,
}: {
  next: string;
  initialError?: string;
  phoneEnabled: boolean;
  signedOutEverywhere?: boolean;
}) {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [emailState, emailAction, emailPending] = useActionState(sendEmailLink, start);
  const [phoneState, phoneAction, phonePending] = useActionState(sendPhoneCode, start);
  const [otpState, otpAction, otpPending] = useActionState(verifyPhoneCode, start);

  if (emailState.step === 'email-sent') {
    return (
      <div className="grid gap-2">
        <h1 className="text-title-md">Check your email</h1>
        <p className="text-body text-muted-foreground">
          We sent a sign-in link to {emailState.email}. It works for 10 minutes.
        </p>
        <form action={emailAction}>
          <input type="hidden" name="email" value={emailState.email} />
          <input type="hidden" name="next" value={next} />
          <Button variant="link" type="submit" loading={emailPending}>
            Send it again
          </Button>
        </form>
      </div>
    );
  }

  if (phoneState.step === 'otp') {
    const state = otpState.error ? otpState : phoneState;
    return (
      <form action={otpAction} className="grid gap-4">
        <h1 className="text-title-md">Enter the code</h1>
        <p className="text-body text-muted-foreground">
          We sent a 6-digit code to {phoneState.phone}. It works for 10 minutes.
        </p>
        <input type="hidden" name="phone" value={phoneState.phone} />
        <input type="hidden" name="next" value={next} />
        <Input
          label="Code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          size="xl"
          required
          error={state.error}
        />
        <Button type="submit" variant="primary" size="lg" block loading={otpPending}>
          Sign in
        </Button>
      </form>
    );
  }

  const error =
    (mode === 'phone' ? phoneState.error : emailState.error) ??
    (initialError === 'expired'
      ? undefined
      : initialError === 'oauth'
        ? 'Google sign-in didn’t finish. Try again or use your email.'
        : undefined);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-title-md">Sign in or create an account</h1>
        <p className="text-body text-muted-foreground">
          Run your agency from lead to paid invoice.
        </p>
      </div>
      {signedOutEverywhere ? (
        <Alert tone="success" title="You’re signed out on every device">
          Sign in again here when you’re ready.
        </Alert>
      ) : null}
      {initialError === 'expired' ? (
        <Alert tone="danger" title="This sign-in link has expired">
          Links work for 10 minutes. Send a new one below.
        </Alert>
      ) : null}
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
      {mode === 'email' ? (
        <form action={emailAction} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@agency.in"
            defaultValue={emailState.email}
            error={error}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            icon={Envelope}
            loading={emailPending}
          >
            Email me a sign-in link
          </Button>
        </form>
      ) : (
        <form action={phoneAction} className="grid gap-4">
          <Input
            label="Mobile number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 90149 52056"
            error={error}
            required
          />
          <Button type="submit" variant="primary" size="lg" block loading={phonePending}>
            Send me a code
          </Button>
        </form>
      )}
      {phoneEnabled ? (
        <Button
          variant="link"
          icon={mode === 'email' ? Phone : Envelope}
          onClick={() => setMode(mode === 'email' ? 'phone' : 'email')}
        >
          {mode === 'email' ? 'Use my phone number' : 'Use my email instead'}
        </Button>
      ) : null}
      <p className="text-caption font-normal text-muted-foreground">
        By continuing you agree to the terms and privacy policy.
      </p>
    </div>
  );
}
