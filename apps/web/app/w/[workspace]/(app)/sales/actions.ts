'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountError } from '@agency-os/db';
import { exampleMode, planLimit } from '@/lib/data';
import {
  createProposal,
  createQuote,
  getProposal,
  getQuote,
  quoteRecipients,
  saveProposalText,
  sendProposal,
} from '@/lib/data/sales';
import { audit } from '@/lib/data/audit';
import { callerIp } from '@/lib/origin';
import { istDate } from '@/lib/data/views';
import { checkProposalText, checkQuote, checkSend, fields, type Errors } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export type QuoteFormState = FormState & { lineErrors?: Record<number, Errors> };

/** The words for an error the database raised; anything else is a real failure. */
function shown(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  throw error;
}

export async function createQuoteAction(
  slug: string,
  _prev: QuoteFormState,
  form: FormData,
): Promise<QuoteFormState> {
  const f = fields(form);
  const { leads, clients } = await quoteRecipients(slug);
  const checked = checkQuote(f, {
    leadIds: leads.map((l) => l.id),
    clientIds: clients.map((c) => c.id),
    today: istDate(new Date()),
  });
  if (!checked.ok) return { errors: checked.errors, lineErrors: checked.lineErrors, values: f };
  const limit =
    (await planLimit(slug, 'quotes_per_month')) ??
    (f.intent === 'proposal' ? await planLimit(slug, 'proposals_per_month') : null);
  if (limit) return { limit, lineErrors: undefined, values: f };
  let id: string;
  let proposalId: string | null = null;
  try {
    id = await createQuote(checked.value, slug);
    if (f.intent === 'proposal') proposalId = await createProposal(id, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  revalidatePath(`/w/${slug}`, 'layout');
  if (proposalId) redirect(`/w/${slug}/sales/proposals/${proposalId}`);
  redirect(`/w/${slug}/sales/quotes/${id}`);
}

export async function createProposalAction(slug: string, quoteId: string): Promise<FormState> {
  const existing = (await getQuote(quoteId, slug))?.proposal;
  if (!existing) {
    const limit = await planLimit(slug, 'proposals_per_month');
    if (limit) return { limit };
  }
  let id: string | null;
  try {
    id = await createProposal(quoteId, slug);
  } catch (error) {
    return { message: shown(error) };
  }
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
  try {
    await saveProposalText(id, checked.value, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
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
  try {
    await sendProposal(id, checked.value.email, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  // The database records the send on the proposal and the lead's timeline itself.
  if (exampleMode())
    audit(
      'proposal.sent',
      (await getProposal(id))?.proposal.title ?? id,
      `To ${checked.value.email}`,
      await callerIp(),
    );
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}
