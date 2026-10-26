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
}: {
  link: string;
  whatsapp: string;
  previewHref: string;
}) {
  const [copied, setCopied] = useState(false);
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
    </div>
  );
}
