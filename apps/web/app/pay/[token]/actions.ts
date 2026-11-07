'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exampleMode } from '@/lib/data';
import { examplePayByToken } from '@/lib/data/pay';
import { isOnlineMethod } from '@/lib/data/pay-methods';
import type { FormState } from '@/lib/form-state';

export async function payByLinkAction(
  token: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  // Real payments go through Razorpay and come back by its redirect and webhook.
  if (!exampleMode()) return { message: 'Online payment isn’t set up yet. Pay by bank transfer.' };
  const method = form.get('method');
  if (!isOnlineMethod(method)) return { message: 'Choose UPI, card or net banking.' };
  const result = await examplePayByToken(token, method);
  if (!result.ok) return { message: result.error };
  revalidatePath(`/pay/${token}`);
  redirect(`/pay/${token}?payment=paid`);
}
