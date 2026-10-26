'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createProposal,
  createQuote,
  quoteRecipients,
  saveProposalText,
  sendProposal,
} from '@/lib/data/sales';
import { istDate } from '@/lib/data/views';
import { checkProposalText, checkQuote, checkSend, fields, type Errors } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export type QuoteFormState = FormState & { lineErrors?: Record<number, Errors> };

export async function createQuoteAction(
  slug: string,
  _prev: QuoteFormState,
  form: FormData,
): Promise<QuoteFormState> {
  const f = fields(form);
  const { leads, clients } = await quoteRecipients();
  const checked = checkQuote(f, {
    leadIds: leads.map((l) => l.id),
    clientIds: clients.map((c) => c.id),
    today: istDate(new Date()),
  });
  if (!checked.ok) return { errors: checked.errors, lineErrors: checked.lineErrors, values: f };
  const id = await createQuote(checked.value);
  revalidatePath(`/w/${slug}`, 'layout');
  if (f.intent === 'proposal') {
    const proposalId = await createProposal(id);
    redirect(`/w/${slug}/sales/proposals/${proposalId}`);
  }
  redirect(`/w/${slug}/sales/quotes/${id}`);
}

export async function createProposalAction(slug: string, quoteId: string) {
  const id = await createProposal(quoteId);
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(id ? `/w/${slug}/sales/proposals/${id}` : `/w/${slug}/sales`);
}

export async function saveProposalAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkProposalText(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  await saveProposalText(id, checked.value);
  revalidatePath(`/w/${slug}/sales/proposals/${id}`);
  return { done: Date.now(), values: f };
}

export async function sendProposalAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkSend(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  await sendProposal(id, checked.value.email);
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}
