'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { clientOptions, createInvoice, getInvoice, issueInvoice, recordPayment } from '@/lib/data';
import { istDate } from '@/lib/data/views';
import { checkInvoice, checkPayment, fields, type Errors } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export type InvoiceFormState = FormState & { lineErrors?: Record<number, Errors> };

export async function createInvoiceAction(
  slug: string,
  _prev: InvoiceFormState,
  form: FormData,
): Promise<InvoiceFormState> {
  const f = fields(form);
  const checked = checkInvoice(f, await clientOptions());
  if (!checked.ok) return { errors: checked.errors, lineErrors: checked.lineErrors, values: f };
  const id = await createInvoice(checked.value);
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`/w/${slug}/invoices/${id}`);
}

export async function issueInvoiceAction(slug: string, id: string) {
  await issueInvoice(id);
  revalidatePath(`/w/${slug}`, 'layout');
}

export async function recordPaymentAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const found = await getInvoice(id);
  if (!found || !found.invoice.number)
    return { message: 'Issue the invoice before recording a payment.' };
  const f = fields(form);
  const checked = checkPayment(
    f,
    {
      currency: found.invoice.currency,
      totalMinor: found.totals.total.amountMinor,
      paidMinor: found.state.paidMinor,
    },
    istDate(new Date()),
  );
  if (!checked.ok) return { errors: checked.errors, values: f };
  await recordPayment(id, checked.value);
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`/w/${slug}/invoices/${id}`);
}
