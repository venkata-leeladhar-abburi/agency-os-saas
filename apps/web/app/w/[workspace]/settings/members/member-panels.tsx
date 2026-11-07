'use client';

import { Copy } from '@phosphor-icons/react';
import { ROLE_LABELS, type Role } from '@agency-os/core';
import { Alert, Button, Dialog, DialogContent, Input, Select } from '@agency-os/ui';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { PlanLimitDialog } from '@/components/workspace/plan-limit';
import { EMPTY_FORM } from '@/lib/form-state';
import {
  changeRoleAction,
  inviteAction,
  removeAction,
  resendAction,
  revokeAction,
  type InviteState,
} from './actions';

const INVITE_ROLES: Role[] = ['admin', 'project_lead', 'member', 'finance', 'hr'];

function LinkToShare({ link, email }: { link: string; email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert tone="success" title={`Invite ready for ${email}`}>
      <p className="mb-2">
        Emails go out once email sending is set up. Until then, send them this link. It works for 7
        days.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label="Invite link"
          value={link}
          readOnly
          className="font-mono"
          containerClassName="min-w-56 flex-1"
        />
        <Button
          icon={Copy}
          onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}
        >
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>
    </Alert>
  );
}

export function InviteForm({ slug }: { slug: string }) {
  const [state, action] = useActionState<InviteState, FormData>(
    inviteAction.bind(null, slug),
    EMPTY_FORM,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <div className="grid gap-3">
      <PlanLimitDialog limit={state.limit} slug={slug} />
      <form ref={form} action={action} className="flex flex-wrap items-start gap-2" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="e.g. meera@agency.in"
          defaultValue={v.email}
          error={e.email}
          containerClassName="min-w-56 flex-1"
        />
        <Select
          label="Role"
          name="role"
          options={INVITE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          defaultValue={v.role ?? 'member'}
          error={e.role}
          containerClassName="w-44"
        />
        <div className="pt-6.5">
          <Submit icon="invite">Invite member</Submit>
        </div>
      </form>
      {state.link && state.email ? <LinkToShare link={state.link} email={state.email} /> : null}
    </div>
  );
}

export function RoleSelect({
  slug,
  memberId,
  name,
  role,
}: {
  slug: string;
  memberId: string;
  name: string;
  role: Role;
}) {
  const [state, action] = useActionState(changeRoleAction.bind(null, slug, memberId), EMPTY_FORM);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className="grid gap-1">
      <Select
        aria-label={`Role for ${name}`}
        name="role"
        options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
        defaultValue={role}
        onChange={() => form.current?.requestSubmit()}
        containerClassName="w-40"
      />
      {state.message ? <p className="text-caption text-danger">{state.message}</p> : null}
    </form>
  );
}

export function RemoveMember({
  slug,
  memberId,
  name,
}: {
  slug: string;
  memberId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async () => removeAction(slug, memberId), EMPTY_FORM);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Remove
      </Button>
      <Dialog open={open && !state.done} onOpenChange={setOpen}>
        <DialogContent
          title={`Remove ${name}?`}
          description="They lose access right away. Their tasks, comments and updates stay, and you can invite them again."
        >
          <form action={action} className="grid gap-4">
            <FormMessage state={state} title="Not removed" />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Keep them</Button>
              <Submit variant="destructive">Remove {name}</Submit>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InviteActions({ slug, id }: { slug: string; id: string }) {
  const [state, resend] = useActionState(
    async () => resendAction(slug, id),
    EMPTY_FORM as InviteState,
  );
  const [pending, start] = useTransition();
  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex gap-2">
        <form action={resend}>
          <Submit size="sm" variant="secondary">
            Send again
          </Submit>
        </form>
        <Button
          size="sm"
          variant="ghost"
          loading={pending}
          onClick={() => start(() => revokeAction(slug, id))}
        >
          Cancel invite
        </Button>
      </div>
      {state.link && state.email ? <LinkToShare link={state.link} email={state.email} /> : null}
    </div>
  );
}
