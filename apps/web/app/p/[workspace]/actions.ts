'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isEmail, normaliseIndianPhone } from '@/lib/auth/helpers';
import { decideGate, examplePayment, saveContact, sendMessage } from '@/lib/data/portal';
import { fields, type Errors } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';
import { currentPortal } from '@/lib/portal-session';

async function session(slug: string) {
  const s = await currentPortal(slug);
  if (!s) redirect(`/p/${slug}`);
  return s;
}

export async function decideGateAction(
  slug: string,
  projectId: string,
  decision: 'approved' | 'changes',
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const s = await session(slug);
  const comment = String(form.get('comment') ?? '');
  const result = await decideGate(s.clientId, projectId, decision, comment);
  if (!result.ok)
    return decision === 'changes'
      ? { errors: { comment: result.error }, values: { comment } }
      : { message: result.error };
  revalidatePath(`/p/${slug}`, 'layout');
  return { done: Date.now() };
}

export async function payAction(slug: string, invoiceId: string): Promise<FormState> {
  const s = await session(slug);
  const result = await examplePayment(s.clientId, invoiceId);
  if (!result.ok) return { message: result.error };
  revalidatePath(`/p/${slug}`, 'layout');
  redirect(`/p/${slug}/payments/${invoiceId}?paid=1`);
}

export async function sendMessageAction(
  slug: string,
  projectId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const s = await session(slug);
  const text = String(form.get('text') ?? '');
  const result = await sendMessage(projectId, { clientId: s.clientId }, text);
  if (!result.ok) return { errors: { text: result.error }, values: { text } };
  revalidatePath(`/p/${slug}`, 'layout');
  return { done: Date.now() };
}

export async function saveContactAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const s = await session(slug);
  const f = fields(form);
  const errors: Errors = {};
  const name = (f.name ?? '').trim();
  if (name.length < 2) errors.name = 'Add your name.';
  const email = (f.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) errors.email = 'Check the email. It should look like name@company.in.';
  const rawPhone = (f.phone ?? '').trim();
  const phone = rawPhone
    ? (normaliseIndianPhone(rawPhone) ?? (/^\+\d[\d\s-]{6,}$/.test(rawPhone) ? rawPhone : null))
    : null;
  if (rawPhone && !phone)
    errors.phone = 'Enter a 10-digit mobile number, or a number starting with +.';
  if (Object.keys(errors).length) return { errors, values: f };
  await saveContact(s.clientId, { contactName: name, email, phone });
  revalidatePath(`/p/${slug}`, 'layout');
  return { done: Date.now(), values: f };
}
