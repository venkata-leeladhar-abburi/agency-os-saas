'use client';

import { ROLE_LABELS, ROLES, type Role } from '@agency-os/core';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Input, Select } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { invite, remove, resend, revoke, setRole, type MemberState } from './actions';

type Member = { id: string; userId: string; role: string; status: string; name: string | null };
type Invitation = {
  id: string;
  email: string | null;
  role: string;
  expired: boolean;
  expiresOn: string;
};

const none: MemberState = {};
const roleOptions = (withOwner: boolean) =>
  ROLES.filter((r) => withOwner || r !== 'owner').map((r) => ({ value: r, label: ROLE_LABELS[r] }));

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function CopyLink({ link, email }: { link: string; email?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert tone="success" title={email ? `Invite link for ${email}` : 'Invite link'}>
      <p className="mb-2 text-body-sm">
        Send this link to them. It works for 7 days. We don’t email invites yet.
      </p>
      <div className="flex items-end gap-2">
        <Input label="Invite link" value={link} readOnly containerClassName="flex-1" />
        <Button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </Alert>
  );
}

function RoleForm({ member, disabled }: { member: Member; disabled: boolean }) {
  const [state, action, pending] = useActionState(setRole, none);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="membershipId" value={member.id} />
      <Select
        aria-label={`Role for ${member.name ?? 'member'}`}
        name="role"
        defaultValue={member.role}
        disabled={disabled || pending}
        options={roleOptions(true)}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        error={state.error}
      />
    </form>
  );
}

function RemoveForm({ member, self }: { member: Member; self: boolean }) {
  const [state, action, pending] = useActionState(remove, none);
  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="membershipId" value={member.id} />
      <ConfirmDialog
        title={self ? 'Leave this workspace?' : `Remove ${member.name ?? 'this member'}?`}
        description={
          self
            ? 'You will lose access to its work. An owner can invite you back.'
            : 'They lose access right away. Their past work and comments stay.'
        }
        confirmLabel={self ? 'Leave workspace' : 'Remove member'}
        tone="danger"
        onConfirm={() => document.getElementById(`remove-${member.id}`)?.click()}
        trigger={
          <Button type="button" size="sm" variant="ghost" loading={pending}>
            {self ? 'Leave' : 'Remove'}
          </Button>
        }
      />
      <button id={`remove-${member.id}`} type="submit" hidden />
      {state.error ? <p className="text-caption text-danger">{state.error}</p> : null}
    </form>
  );
}

function InvitationRow({ invitation }: { invitation: Invitation }) {
  const [reissued, reissue, reissuing] = useActionState(resend, none);
  const [revoked, cancel, cancelling] = useActionState(revoke, none);
  return (
    <li className="grid gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-body font-medium">{invitation.email}</p>
          <p className="text-caption text-muted-foreground">
            {ROLE_LABELS[invitation.role as Role] ?? invitation.role} ·{' '}
            {invitation.expired ? 'Expired' : `Expires ${formatDate(invitation.expiresOn)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={reissue}>
            <input type="hidden" name="invitationId" value={invitation.id} />
            <input type="hidden" name="email" value={invitation.email ?? ''} />
            <input type="hidden" name="role" value={invitation.role} />
            <Button type="submit" size="sm" loading={reissuing}>
              Resend
            </Button>
          </form>
          <form action={cancel}>
            <input type="hidden" name="invitationId" value={invitation.id} />
            <Button type="submit" size="sm" variant="ghost" loading={cancelling}>
              Cancel invite
            </Button>
          </form>
        </div>
      </div>
      {reissued.link ? <CopyLink link={reissued.link} email={reissued.email} /> : null}
      {reissued.error || revoked.error ? (
        <Alert tone="danger">{reissued.error ?? revoked.error}</Alert>
      ) : null}
    </li>
  );
}

export function MembersView({
  canManage,
  currentUserId,
  workspaceName,
  members,
  invitations,
}: {
  canManage: boolean;
  currentUserId: string;
  workspaceName: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const [state, action, pending] = useActionState(invite, none);
  return (
    <div className="grid gap-8">
      <div>
        <p className="text-overline-caps text-muted-foreground">{workspaceName}</p>
        <h1 className="text-title-lg">Members</h1>
      </div>

      {canManage ? (
        <form action={action} className="grid gap-4 rounded-lg border border-border bg-card p-4">
          <h2 className="text-title-sm">Invite someone</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Input label="Email" name="email" type="email" required placeholder="name@agency.in" />
            <Select label="Role" name="role" defaultValue="member" options={roleOptions(false)} />
          </div>
          {state.error ? (
            <Alert tone="danger" title="The invite wasn’t created">
              {state.error}
            </Alert>
          ) : null}
          {state.link ? <CopyLink link={state.link} email={state.email} /> : null}
          <div>
            <Button type="submit" variant="primary" loading={pending}>
              Create invite link
            </Button>
          </div>
        </form>
      ) : null}

      <section aria-labelledby="team" className="grid gap-2">
        <h2 id="team" className="text-title-sm">
          Team
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card px-4">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                <span className="text-body font-medium">{m.name ?? 'Team member'}</span>
                {m.userId === currentUserId ? <Badge>You</Badge> : null}
                {m.status === 'suspended' ? <Badge>Suspended</Badge> : null}
              </div>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <RoleForm member={m} disabled={false} />
                  <RemoveForm member={m} self={m.userId === currentUserId} />
                </div>
              ) : (
                <span className="text-body-sm text-muted-foreground">
                  {ROLE_LABELS[m.role as Role] ?? m.role}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canManage ? (
        <section aria-labelledby="pending" className="grid gap-2">
          <h2 id="pending" className="text-title-sm">
            Pending invites
          </h2>
          {invitations.length === 0 ? (
            <EmptyState title="No pending invites" compact>
              Invites you send show here until they are accepted.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card px-4">
              {invitations.map((i) => (
                <InvitationRow key={i.id} invitation={i} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
