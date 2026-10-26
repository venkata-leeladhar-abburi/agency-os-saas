'use client';

import { Copy, PaperPlaneTilt, WhatsappLogo } from '@phosphor-icons/react';
import { Alert, Button, Dialog, DialogContent, Input, Textarea } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import type { Fields } from '@/lib/forms';
import { saveProposalAction, sendProposalAction } from '../../actions';

export function ProposalTextForm({
  slug,
  id,
  values,
}: {
  slug: string;
  id: string;
  values: Fields;
}) {
  const [state, action] = useActionState(saveProposalAction.bind(null, slug, id), EMPTY_FORM);
  const v = state.values ?? values;
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} title="The proposal wasn’t saved" />
      <Textarea
        label="About us"
        name="about"
        rows={3}
        defaultValue={v.about}
        placeholder="Two or three sentences about your studio and the work you’re proudest of."
      />
      <Textarea
        label="Your goals"
        name="goals"
        rows={3}
        defaultValue={v.goals}
        hint="One goal per line."
      />
      <Textarea
        label="Included"
        name="included"
        rows={3}
        defaultValue={v.included}
        hint="One item per line. Filled from the quote."
        error={e.included}
      />
      <Textarea label="Not included" name="excluded" optional rows={2} defaultValue={v.excluded} />
      <Textarea
        label="Payment terms"
        name="paymentTerms"
        rows={2}
        defaultValue={v.paymentTerms}
        error={e.paymentTerms}
      />
      <Textarea
        label="Terms"
        name="terms"
        rows={3}
        defaultValue={v.terms}
        placeholder="Ownership, revisions, timelines, cancellation."
        hint="Agency OS does not provide legal advice."
      />
      <div className="flex items-center justify-end gap-3">
        {state.done ? (
          <p role="status" className="text-body-sm text-muted-foreground">
            Proposal saved.
          </p>
        ) : null}
        <Submit variant="secondary">Save proposal</Submit>
      </div>
    </form>
  );
}

export function SendDialog({
  slug,
  id,
  client,
  email,
  link,
  unfilled,
  resend,
}: {
  slug: string;
  id: string;
  client: string;
  email: string;
  link: string;
  /** Blocks still showing placeholder text; they're left out of what the client sees. */
  unfilled: string[];
  resend: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, action] = useActionState(sendProposalAction.bind(null, slug, id), EMPTY_FORM);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Here is our proposal for ${client}: ${link}`)}`;
  return (
    <>
      <Button
        variant={resend ? 'secondary' : 'primary'}
        icon={PaperPlaneTilt}
        onClick={() => setOpen(true)}
      >
        {resend ? 'Send again' : 'Send proposal'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Send the proposal to ${client}`}
          description="They get a link to read and sign it on any device."
        >
          {state.done ? (
            <div className="grid gap-4">
              <Alert tone="success" title="Proposal sent">
                Emails go out once email sending is set up. Until then, share the link yourself.
              </Alert>
              <Input label="Link for the client" value={link} readOnly className="font-mono" />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  icon={Copy}
                  onClick={() => {
                    void navigator.clipboard?.writeText(link).then(() => setCopied(true));
                  }}
                >
                  {copied ? 'Link copied' : 'Copy link'}
                </Button>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-body-medium no-underline hover:bg-accent"
                >
                  <WhatsappLogo size={16} aria-hidden="true" /> Share on WhatsApp
                </a>
                <Button variant="primary" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form action={action} className="grid gap-4" noValidate>
              {unfilled.length ? (
                <Alert tone="warning" title="Some blocks still show the template text">
                  {unfilled.join(', ')} won’t be shown to the client until you fill them in.
                </Alert>
              ) : null}
              <Input
                label="To"
                name="email"
                type="email"
                defaultValue={state.values?.email ?? email}
                error={state.errors?.email}
                hint="The signing code goes here too."
              />
              <Textarea
                label="Message"
                name="message"
                rows={3}
                defaultValue={
                  state.values?.message ??
                  `Hi, here is our proposal for ${client}. It’s valid for 14 days.`
                }
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Submit icon="send">Send proposal</Submit>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
