'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exampleMode } from '@/lib/data';
import { saveProfile } from '@/lib/data/profile';
import { checkProfile, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';
import { supabaseServer } from '@/lib/supabase/server';

export async function saveProfileAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkProfile(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const result = await saveProfile(checked.value, slug);
  if (result.error) return { errors: { [result.field ?? 'name']: result.error }, values: f };
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}

/**
 * Ends every session you have, on every device, this one included (D-068). Each device asks
 * for a new sign-in link the next time it opens a page.
 */
export async function signOutEverywhereAction() {
  if (exampleMode()) return;
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/sign-in?signed-out=everywhere');
}
