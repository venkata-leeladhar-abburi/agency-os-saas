'use server';

import { revalidatePath } from 'next/cache';
import { AccountError } from '@agency-os/db';
import { saveSettings, exampleMode } from '@/lib/data';
import { audit } from '@/lib/data/audit';
import { callerIp } from '@/lib/origin';

import { saveNotificationPrefs } from '@/lib/data/notifications';
import { NOTIFICATION_CATEGORIES } from '@/lib/data/types';
import { checkNotificationPrefs, checkSettings, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';

export async function saveSettingsAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkSettings(f, form.getAll('services').map(String));
  if (!checked.ok) return { errors: checked.errors, values: f };
  try {
    await saveSettings(checked.value, slug);
  } catch (error) {
    if (error instanceof AccountError) return { message: error.message, values: f };
    throw error;
  }
  if (exampleMode())
    audit(
      'settings.saved',
      checked.value.name,
      `Prefix ${checked.value.invoicePrefix}, GSTIN ${checked.value.gstin ?? 'none'}`,
      await callerIp(),
    );
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}

export async function savePrefsAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const prefs = checkNotificationPrefs(
    fields(form),
    NOTIFICATION_CATEGORIES.map((c) => c.id),
  );
  await saveNotificationPrefs(prefs, slug);
  revalidatePath(`/w/${slug}/settings/notifications`);
  return { done: Date.now() };
}
