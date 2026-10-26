'use server';

import { AccountError, acceptInvitation, saveProfileName, withUser } from '@agency-os/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { database } from '../../../lib/server/db';
import { requireSession } from '../../../lib/server/session';
import { WORKSPACE_COOKIE } from '../../../lib/server/workspace';

export type InviteState = { error?: string; code?: string };

export async function acceptInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const token = String(formData.get('token') ?? '');
  const session = await requireSession(`/invite/${token}`);
  const db = database();
  if (!db) return { error: 'The database isn’t connected yet. Ask the owner to add DATABASE_URL.' };

  let workspaceId: string;
  try {
    workspaceId = await withUser(db, session, async (tx) => {
      const name = String(formData.get('name') ?? '');
      if (name.trim()) await saveProfileName(tx, session.userId, name);
      return acceptInvitation(tx, token);
    });
  } catch (error) {
    if (error instanceof AccountError) return { error: error.message, code: error.code };
    return { error: 'We couldn’t accept the invite. Try again in a moment.' };
  }
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  });
  redirect('/app');
}
