'use server';

import { revalidatePath } from 'next/cache';
import { AccountError } from '@agency-os/db';
import { postDailyUpdate } from '@/lib/data/team';
import { checkDailyUpdate, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export async function postUpdateAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkDailyUpdate(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  try {
    await postDailyUpdate(checked.value, slug);
  } catch (error) {
    if (error instanceof AccountError) return { message: error.message, values: f };
    throw error;
  }
  revalidatePath(`/w/${slug}/team`);
  return { done: Date.now(), values: f };
}
