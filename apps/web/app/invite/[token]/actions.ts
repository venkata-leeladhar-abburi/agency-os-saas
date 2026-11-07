'use server';

import { AccountError, acceptInvitation, withUser } from '@agency-os/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireDb, requireSession, WORKSPACE_COOKIE } from '../../../lib/server/session';

export type AcceptState = { error?: string };

export async function acceptInvite(_: AcceptState, form: FormData): Promise<AcceptState> {
  const token = String(form.get('token') ?? '');
  const session = await requireSession(`/invite/${token}`);
  let workspaceId: string;
  try {
    workspaceId = await withUser(requireDb(), session, (tx) => acceptInvitation(tx, token));
  } catch (error) {
    return {
      error:
        error instanceof AccountError
          ? error.message
          : 'We couldn’t accept the invite. Check your connection and try again.',
    };
  }
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/home');
}
