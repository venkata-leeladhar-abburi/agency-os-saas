'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountError } from '@agency-os/db';
import {
  clientOptions,
  createInvoice,
  getInvoice,
  invoiceLimit,
  issueInvoice,
  recordPayment,
  newPayLink,
  setInvoiceReminders,
  exampleMode,
} from '@/lib/data';
import { formatMoney } from '@agency-os/core';
import { audit } from '@/lib/data/audit';
import { callerIp } from '@/lib/origin';
import { istDate } from '@/lib/data/views';
import { checkInvoice, checkPayment, fields, type Errors } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

/** Example mode only: the database writes its own audit entries. */
async function auditIssued(slug: string, id: string) {
  if (!exampleMode()) return;
  const found = await getInvoice(id, slug);
  if (found?.invoice.number)
    audit(
      'invoice.issued',
      found.invoice.number,
      `${found.client.name} · ${formatMoney(found.totals.total.amountMinor, found.invoice.currency)}`,
      await callerIp(),
    );
}

/** The words for an error the database raised; anything else is a real failure. */
function shown(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  throw error;
}

export type InvoiceFormState = FormState & { lineErrors?: Record<number, Errors> };

export async function createInvoiceAction(
  slug: string,
  _prev: InvoiceFormState,
  form: FormData,
): Promise<InvoiceFormState> {
  const f = fields(form);
  const checked = checkInvoice(f, await clientOptions(slug));
  if (!checked.ok) return { errors: checked.errors, lineErrors: checked.lineErrors, values: f };
  const limit = await invoiceLimit(slug);
  if (limit) return { limit, values: f };
  let id: string;
  try {
    id = await createInvoice(checked.value, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  if (checked.value.issue) await auditIssued(slug, id);
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`/w/${slug}/invoices/${id}`);
}

export async function issueInvoiceAction(slug: string, id: string) {
  await issueInvoice(id, slug);
  await auditIssued(slug, id);
  revalidatePath(`/w/${slug}`, 'layout');
}

export async function recordPaymentAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const found = await getInvoice(id, slug);
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
  try {
    await recordPayment(id, checked.value, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  if (exampleMode())
    audit(
      'payment.recorded',
      found.invoice.number,
      `${formatMoney(checked.value.amountMinor, found.invoice.currency)} · ${checked.value.method.replace('_', ' ')}`,
      await callerIp(),
    );
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`/w/${slug}/invoices/${id}`);
}

export async function setRemindersAction(slug: string, id: string, on: boolean) {
  await setInvoiceReminders(id, on, slug);
  revalidatePath(`/w/${slug}/invoices/${id}`);
}

export async function newPayLinkAction(slug: string, id: string) {
  const number = await newPayLink(id, slug);
  if (number)
    audit('invoice.link_replaced', number, 'The old link stopped working', await callerIp());
  revalidatePath(`/w/${slug}/invoices/${id}`);
}
