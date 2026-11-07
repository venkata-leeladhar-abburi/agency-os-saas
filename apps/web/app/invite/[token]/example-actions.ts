'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exampleMode } from '@/lib/data';
import { audit } from '@/lib/data/audit';
import { acceptInvite, invitationByToken } from '@/lib/data/team';
import type { FormState } from '@/lib/form-state';
import { callerIp } from '@/lib/origin';

export async function acceptExampleInviteAction(
  token: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (!exampleMode()) return { message: 'Sign in with the email the invite was sent to.' };
  const name = String(form.get('name') ?? '').trim();
  if (name.length < 2) return { errors: { name: 'Add your name.' }, values: { name } };
  const found = await invitationByToken(token);
  const result = await acceptInvite(token, name);
  if (!result.ok) return { message: result.error, values: { name } };
  if (found.state === 'open')
    audit('member.joined', found.invite.email, name, await callerIp(), name);
  revalidatePath('/w', 'layout');
  redirect(`/invite/${token}?joined=${encodeURIComponent(name)}`);
}
