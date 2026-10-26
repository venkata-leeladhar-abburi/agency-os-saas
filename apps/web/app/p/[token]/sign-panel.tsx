'use client';

import { Alert, Button, Dialog, DialogContent, Input, Textarea } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { acceptAction, declineAction, startSigningAction, type SignState } from './actions';

/** Accept and sign: type your name, get a code by email, enter it. */
export function SignPanel({ token, email }: { token: string; email: string }) {
  const [nameState, nameAction] = useActionState<SignState, FormData>(
    startSigningAction.bind(null, token),
    { step: 'name' },
  );
  const [codeState, codeAction] = useActionState<SignState, FormData>(
    acceptAction.bind(null, token),
    {},
  );

  if (codeState.step === 'signed')
    return (
      <Alert tone="success" title="You accepted this proposal">
        Thank you. The agency has been told and will be in touch to start.
      </Alert>
    );

  if (nameState.step === 'code')
    return (
      <form action={codeAction} className="grid gap-4" noValidate>
        <input type="hidden" name="name" value={nameState.name} />
        <FormMessage state={codeState} title="Not signed yet" />
        {nameState.exampleCode ? (
          <Alert tone="info" title={`Example mode: your code is ${nameState.exampleCode}`}>
            Once email is set up, the code goes to {email} instead of showing here.
          </Alert>
        ) : null}
        <p className="text-body">
          Signing as <strong>{nameState.name}</strong>. We sent a 6-digit code to {email}. It works
          for 10 minutes.
        </p>
        <Input
          label="Code from your email"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          size="xl"
          error={codeState.errors?.code}
        />
        <Submit size="xl" block>
          Accept proposal
        </Submit>
      </form>
    );

  return (
    <form action={nameAction} className="grid gap-4" noValidate>
      <FormMessage state={nameState} title="Not signed yet" />
      <Input
        label="Your full name"
        name="name"
        autoComplete="name"
        size="xl"
        defaultValue={nameState.values?.name}
        error={nameState.errors?.name}
        hint="Typing your name is your signature. It’s recorded with the time and the code from your email."
      />
      <Submit size="xl" block>
        Email me a code to sign
      </Submit>
    </form>
  );
}

export function DeclineButton({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(declineAction.bind(null, token), EMPTY_FORM);
  return (
    <>
      <Button variant="ghost" size="xl" onClick={() => setOpen(true)}>
        Decline
      </Button>
      <Dialog open={open && !state.done} onOpenChange={setOpen}>
        <DialogContent
          title="Decline this proposal?"
          description="The agency is told. A reason helps them, but you don’t have to give one."
        >
          <form action={action} className="grid gap-4">
            <FormMessage state={state} title="Not declined" />
            <Textarea label="Reason" name="reason" optional rows={3} />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Keep it open</Button>
              <Submit variant="destructive">Decline proposal</Submit>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
