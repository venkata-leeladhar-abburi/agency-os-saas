'use server';

import { revalidatePath } from 'next/cache';
import { saveSettings } from '@/lib/data';
import { checkSettings, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export async function saveSettingsAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkSettings(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  await saveSettings(checked.value);
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}
