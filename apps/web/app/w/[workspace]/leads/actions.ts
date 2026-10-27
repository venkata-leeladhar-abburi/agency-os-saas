'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AccountError } from '@agency-os/db';
import {
  addLeadNote,
  createLead,
  getLead,
  markLeadLost,
  moveLead,
  planLimit,
  setLeadFollowUp,
  winLead,
} from '@/lib/data';
import type { StageId } from '@/lib/data/types';
import { STAGES } from '@/lib/data/types';
import { checkLead, checkLostReason, checkNote, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

const leadsPath = (slug: string) => `/w/${slug}/leads`;

/** The words for an error the database raised; anything else is a real failure. */
function shown(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  throw error;
}

export async function createLeadAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkLead(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const limit = await planLimit(slug, 'open_leads');
  if (limit) return { limit, values: f };
  let id: string;
  try {
    id = await createLead(checked.value, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  revalidatePath(leadsPath(slug));
  redirect(`${leadsPath(slug)}/${id}`);
}

/** From the board. Returns where to go next inside the workspace (the new client, for Won), or null to stay. */
export async function moveLeadAction(slug: string, id: string, to: string): Promise<string | null> {
  const lead = await getLead(id, slug);
  if (!lead || !STAGES.some((s) => s.id === to)) return null;
  if (to === 'won') {
    const clientId = await winLead(id, slug);
    revalidatePath(`/w/${slug}`, 'layout');
    return clientId ? `clients/${clientId}?from=lead` : null;
  }
  await moveLead(id, to as StageId, slug);
  revalidatePath(`/w/${slug}`, 'layout');
  return null;
}

export async function changeStageAction(slug: string, id: string, form: FormData) {
  const to = String(form.get('stage') ?? '');
  if (to === 'won') return winLeadAction(slug, id);
  if (STAGES.some((s) => s.id === to) && to !== 'lost') await moveLead(id, to as StageId, slug);
  revalidatePath(`${leadsPath(slug)}/${id}`);
}

export async function winLeadAction(slug: string, id: string) {
  const clientId = await winLead(id, slug);
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(clientId ? `/w/${slug}/clients/${clientId}?from=lead` : leadsPath(slug));
}

export async function markLostAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkLostReason(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  try {
    await markLeadLost(id, checked.value.reason, checked.value.note, slug);
  } catch (error) {
    return { message: shown(error), values: f };
  }
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`${leadsPath(slug)}/${id}`);
}

export async function addNoteAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkNote(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  await addLeadNote(id, checked.value.note, slug);
  revalidatePath(`${leadsPath(slug)}/${id}`);
  return { done: Date.now() };
}

export async function setFollowUpAction(
  slug: string,
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const on = String(form.get('followUpOn') ?? '');
  if (on && !/^\d{4}-\d{2}-\d{2}$/.test(on)) return { errors: { followUpOn: 'Pick a date.' } };
  await setLeadFollowUp(id, on || null, slug);
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}
