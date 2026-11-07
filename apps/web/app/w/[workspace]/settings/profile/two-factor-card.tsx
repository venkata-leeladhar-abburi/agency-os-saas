'use client';

import { ShieldCheck } from '@phosphor-icons/react';
import { Alert, Badge, Button, Card, Input } from '@agency-os/ui';
import { useActionState, useState, useTransition } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import {
  confirmTwoFactorAction,
  startTwoFactorAction,
  turnOffTwoFactorAction,
  type TwoFactorState,
} from './actions';

/** Set up, or turn off, two-factor login with an authenticator app (D-071). */
export function TwoFactorCard({ on: initiallyOn, example }: { on: boolean; example: boolean }) {
  const [on, setOn] = useState(initiallyOn);
  const [setup, setSetup] = useState<TwoFactorState['setup']>();
  const [startError, setStartError] = useState<string>();
  const [starting, startTransition] = useTransition();
  const [turningOff, setTurningOff] = useState(false);

  const start = () =>
    startTransition(async () => {
      const result = await startTwoFactorAction();
      setStartError(result.error);
      setSetup(result.setup);
    });

  return (
    <Card
      title="Two-factor login"
      description="After your sign-in link, Agency OS also asks for a code from an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator."
    >
      {example ? (
        <p className="text-body-sm text-muted-foreground">
          Example mode has no sign-in, so two-factor login can’t be set up here.
        </p>
      ) : on ? (
        <div className="grid gap-3">
          <p className="flex items-center gap-2 text-body">
            <Badge tone="success">On</Badge> Sign-in asks for a code from your authenticator app.
          </p>
          {turningOff ? (
            <TurnOff onDone={() => (setOn(false), setTurningOff(false))} />
          ) : (
            <div>
              <Button onClick={() => setTurningOff(true)}>Turn off two-factor login</Button>
            </div>
          )}
        </div>
      ) : setup ? (
        <Confirm setup={setup} onDone={() => (setOn(true), setSetup(undefined))} />
      ) : (
        <div className="grid gap-3">
          {startError ? (
            <Alert tone="danger" title="Two-factor login wasn’t set up">
              {startError}
            </Alert>
          ) : null}
          <div>
            <Button variant="primary" icon={ShieldCheck} loading={starting} onClick={start}>
              Set up two-factor login
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Confirm({
  setup,
  onDone,
}: {
  setup: NonNullable<TwoFactorState['setup']>;
  onDone: () => void;
}) {
  const [state, action] = useActionState<TwoFactorState, FormData>(async (prev, form) => {
    const next = await confirmTwoFactorAction(setup, prev, form);
    if (next.on) onDone();
    return next;
  }, {});
  return (
    <form action={action} className="grid gap-4" noValidate>
      <ol className="grid gap-1 pl-5 text-body">
        <li>Open your authenticator app and add an account.</li>
        <li>Scan this QR code, or type in the key below it.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      {/* The QR code is an SVG from Supabase, shown once while setting up. */}
      <img
        src={setup.qrCode}
        alt="QR code to add Agency OS to your authenticator app"
        width={176}
        height={176}
        className="rounded-md border border-border bg-white p-2"
      />
      <p className="text-body-sm">
        Key: <code className="font-mono break-all">{setup.secret}</code>
      </p>
      <Input
        label="Code from the app"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        error={state.error}
        containerClassName="max-w-60"
      />
      <div>
        <Submit>Turn on two-factor login</Submit>
      </div>
    </form>
  );
}

function TurnOff({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState<TwoFactorState, FormData>(async (prev, form) => {
    const next = await turnOffTwoFactorAction(prev, form);
    if (next.on === false) onDone();
    return next;
  }, {});
  return (
    <form action={action} className="grid gap-3" noValidate>
      <Input
        label="Code from your authenticator app"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        hint="To turn it off, enter a current code."
        required
        error={state.error}
        containerClassName="max-w-60"
      />
      <div>
        <Submit variant="destructive">Turn off</Submit>
      </div>
    </form>
  );
}
