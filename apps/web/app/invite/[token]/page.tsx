import { Alert, Button, buttonVariants, Logo } from '@agency-os/ui';
import Link from 'next/link';
import { acceptInvitation, AccountError, myWorkspaces, withUser } from '@agency-os/db';
import { redirect } from 'next/navigation';
import { database } from '@/lib/server/db';
import { currentUser } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@agency-os/core';
import { EXAMPLE_SLUG, exampleMode, settings } from '@/lib/data';
import { invitationByToken } from '@/lib/data/team';
import { ExampleInvite } from './example-invite';

export const metadata = { title: 'Accept invite · Agency OS' };

async function accept(token: string) {
  'use server';
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  const db = database();
  if (!db) redirect(`/invite/${token}?error=database`);
  let id: string;
  try {
    id = await withUser(db, { userId: user.id, email: user.email }, (tx) =>
      acceptInvitation(tx, token),
    );
  } catch (error) {
    redirect(`/invite/${token}?error=${error instanceof AccountError ? error.code : 'failed'}`);
  }
  const list = await withUser(db, { userId: user.id, email: user.email }, (tx) => myWorkspaces(tx));
  redirect(`/w/${list.find((w) => w.id === id)?.slug ?? ''}`);
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  invite_expired: {
    title: 'This invite has expired',
    body: 'Invites work for 7 days. Ask the person who invited you to send a new one.',
  },
  invite_invalid: {
    title: 'This invite link doesn’t work',
    body: 'It may have been revoked or already used. Ask for a new invite.',
  },
  invite_email_mismatch: {
    title: 'This invite was sent to a different email',
    body: 'Sign in with the address the invite was sent to, or ask for a new invite.',
  },
  database: {
    title: 'We couldn’t reach the database',
    body: 'Wait a minute, then open the invite link again.',
  },
  failed: { title: 'The invite wasn’t accepted', body: 'Check your connection and try again.' },
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; joined?: string }>;
}) {
  const { token } = await params;
  const { error, joined } = await searchParams;
  if (exampleMode()) return <ExampleInvitePage token={token} joined={joined} />;
  const user = await currentUser();
  const message = error ? (MESSAGES[error] ?? MESSAGES.failed!) : null;
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-10">
      <Logo />
      <div className="grid gap-4">
        {message ? (
          <>
            <h1 className="text-title-md">{message.title}</h1>
            <p className="text-body text-muted-foreground">{message.body}</p>
          </>
        ) : (
          <>
            <h1 className="text-title-md">You’ve been invited to a workspace</h1>
            <p className="text-body text-muted-foreground">
              {user
                ? `You’re signed in as ${user.email}. Accept to join.`
                : 'Sign in with the email the invite was sent to, then accept.'}
            </p>
            <form action={accept.bind(null, token)}>
              <Button type="submit" variant="primary" size="lg" block>
                {user ? 'Accept invite' : 'Sign in to accept'}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

const EXAMPLE_STATES = {
  expired: ['This invite has expired', 'Invites work for 7 days. Ask for a new one.'],
  revoked: ['This invite was cancelled', 'Ask the person who invited you for a new one.'],
  used: ['This invite has already been used', 'Sign in to open the workspace.'],
  invalid: ['This invite link doesn’t work', 'Check the link, or ask for a new invite.'],
} as const;

async function ExampleInvitePage({ token, joined }: { token: string; joined?: string }) {
  const found = await invitationByToken(token);
  if (joined && found.state === 'used')
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-10">
        <Logo />
        <Alert tone="success" title={`${joined} joined ${(await settings()).name}`}>
          They’re on the team as {ROLE_LABELS[found.invite.role]}.
        </Alert>
        <Link href={`/w/${EXAMPLE_SLUG}/team`} className={buttonVariants({ variant: 'primary' })}>
          Open the team
        </Link>
      </main>
    );
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-10">
      <Logo />
      {found.state === 'open' ? (
        <ExampleInvite
          token={token}
          workspace={found.workspace}
          role={ROLE_LABELS[found.invite.role]}
        />
      ) : (
        <div className="grid gap-3">
          <h1 className="text-title-md">{EXAMPLE_STATES[found.state][0]}</h1>
          <p className="text-body text-muted-foreground">{EXAMPLE_STATES[found.state][1]}</p>
        </div>
      )}
    </main>
  );
}
