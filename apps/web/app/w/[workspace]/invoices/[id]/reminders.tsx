'use client';

import { Copy, Envelope, WhatsappLogo } from '@phosphor-icons/react';
import { Button, buttonVariants, Input, Switch } from '@agency-os/ui';
import { useOptimistic, useState, useTransition } from 'react';
import { setRemindersAction } from '../actions';

export function RemindersSwitch({ slug, id, on }: { slug: string; id: string; on: boolean }) {
  const [pending, start] = useTransition();
  const [checked, setChecked] = useOptimistic(on);
  return (
    <Switch
      label="Send reminders"
      description="3 days before, on the due date, then 3 and 7 days after. They stop when it’s paid."
      checked={checked}
      disabled={pending}
      onCheckedChange={(next) =>
        start(async () => {
          setChecked(next);
          await setRemindersAction(slug, id, next);
        })
      }
    />
  );
}

/** The pay link, to copy, send on WhatsApp, or see as the reminder email. */
export function ShareLink({
  link,
  whatsapp,
  previewHref,
  replace,
}: {
  link: string;
  whatsapp: string;
  previewHref: string;
  /** Bound newPayLinkAction. */
  replace: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [replacing, start] = useTransition();
  return (
    <div className="grid gap-3">
      <Input
        label="Pay link"
        value={link}
        readOnly
        className="font-mono"
        hint="Opens the invoice to pay or download. No sign-in needed."
      />
      <div className="flex flex-wrap gap-2">
        <Button
          icon={Copy}
          onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}
        >
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
        <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonVariants({})}>
          <WhatsappLogo size={16} aria-hidden="true" /> Send on WhatsApp
        </a>
        <a
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'ghost' })}
        >
          <Envelope size={16} aria-hidden="true" /> Preview the reminder email
        </a>
      </div>
      {confirming ? (
        <div
          className="grid gap-2 rounded-md border border-border p-3"
          role="group"
          aria-label="Make a new link"
        >
          <p className="text-body-sm">
            The link above stops working at once. Send the new one to the client.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={replacing}
              onClick={() =>
                start(async () => {
                  await replace();
                  setConfirming(false);
                  setCopied(false);
                })
              }
            >
              Make a new link
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Keep this link
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="justify-self-start text-body-sm text-muted-foreground underline"
        >
          Sent it to the wrong person? Make a new link
        </button>
      )}
    </div>
  );
}
