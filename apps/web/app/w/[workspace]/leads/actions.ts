'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addLeadNote,
  createLead,
  getLead,
  markLeadLost,
  moveLead,
  setLeadFollowUp,
  winLead,
} from '@/lib/data';
import type { StageId } from '@/lib/data/types';
import { needsUpgrade } from '@/lib/data/plan';
import { STAGES } from '@/lib/data/types';
import { checkLead, checkLostReason, checkNote, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

const leadsPath = (slug: string) => `/w/${slug}/leads`;

export async function createLeadAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkLead(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const limit = await needsUpgrade('open_leads');
  if (limit) return { limit, values: f };
  const id = await createLead(checked.value);
  revalidatePath(leadsPath(slug));
  redirect(`${leadsPath(slug)}/${id}`);
}

/** From the board. Returns where to go next inside the workspace (the new client, for Won), or null to stay. */
export async function moveLeadAction(id: string, to: string): Promise<string | null> {
  const lead = await getLead(id);
  if (!lead || !STAGES.some((s) => s.id === to)) return null;
  if (to === 'won') {
    const clientId = await winLead(id);
    revalidatePath('/w', 'layout');
    return clientId ? `clients/${clientId}?from=lead` : null;
  }
  await moveLead(id, to as StageId);
  revalidatePath('/w', 'layout');
  return null;
}

export async function changeStageAction(slug: string, id: string, form: FormData) {
  const to = String(form.get('stage') ?? '');
  if (to === 'won') return winLeadAction(slug, id);
  if (STAGES.some((s) => s.id === to) && to !== 'lost') await moveLead(id, to as StageId);
  revalidatePath(`${leadsPath(slug)}/${id}`);
}

export async function winLeadAction(slug: string, id: string) {
  const clientId = await winLead(id);
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
  await markLeadLost(id, checked.value.reason, checked.value.note);
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
  await addLeadNote(id, checked.value.note);
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
  await setLeadFollowUp(id, on || null);
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}
