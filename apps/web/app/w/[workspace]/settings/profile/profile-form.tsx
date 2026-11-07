'use client';

import { SignOut } from '@phosphor-icons/react';
import { Alert, Button, Card, Dialog, DialogContent, Input } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import type { Profile } from '@/lib/data/profile';
import { EMPTY_FORM } from '@/lib/form-state';
import { saveProfileAction, signOutEverywhereAction } from './actions';

export function ProfileForm({ slug, profile }: { slug: string; profile: Profile }) {
  const [state, action] = useActionState(saveProfileAction.bind(null, slug), EMPTY_FORM);
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} title="Your profile wasn’t saved" />
      {state.done ? (
        <Alert tone="success" title="Profile saved">
          Your team and clients see your new details.
        </Alert>
      ) : null}
      <Card title="About you" description="Your team sees these, and clients see your name.">
        <div className="grid gap-4">
          <Input
            label="Your name"
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            defaultValue={state.values?.name ?? profile.name}
            error={e.name}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            optional
            hint="So your team can call you. A 10-digit mobile, or a number starting with +."
            defaultValue={state.values?.phone ?? profile.phone ?? ''}
            error={e.phone}
          />
          <Input
            label="Email"
            value={profile.email}
            readOnly
            hint="You sign in with this address. It can’t be changed here yet."
          />
        </div>
      </Card>
      <div>
        <Submit>Save profile</Submit>
      </div>
    </form>
  );
}

/** Ends every session on every device, after a confirmation. */
export function SignOutEverywhere({ example }: { example: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Card
      title="Signed-in devices"
      description="Lost a phone, or signed in on a shared computer? Sign out everywhere. You can sign in again with a new link."
    >
      {example ? (
        <p className="text-body-sm text-muted-foreground">
          Example mode has no sign-in, so there’s nothing to sign out of.
        </p>
      ) : (
        <>
          <Button icon={SignOut} onClick={() => setOpen(true)}>
            Sign out of all devices
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
              title="Sign out of all devices?"
              description="Every device you’re signed in on, this one included, signs out. Each one needs a new sign-in link."
            >
              <form action={signOutEverywhereAction} className="flex justify-end gap-2">
                <Button onClick={() => setOpen(false)}>Stay signed in</Button>
                <Submit variant="destructive">Sign out everywhere</Submit>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Card>
  );
}
