'use server';

import { formatRatio } from '@agency-os/core';
import { revalidatePath } from 'next/cache';
import { saveBrandColour, saveLogo } from '@/lib/data';
import { audit } from '@/lib/data/audit';
import { reviewBrandColour } from '@/lib/branding';
import { checkBranding, checkLogo, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';
import { callerIp } from '@/lib/origin';

function refresh(slug: string) {
  revalidatePath(`/w/${slug}`, 'layout');
  revalidatePath(`/p/${slug}`, 'layout');
}

export async function saveBrandColourAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  const checked = checkBranding(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  const { brandColour } = checked.value;
  await saveBrandColour(brandColour);
  audit(
    'branding.saved',
    'Brand colour',
    brandColour
      ? `${brandColour.toUpperCase()}, ${formatRatio(reviewBrandColour(brandColour).ratio)} with white text`
      : 'Back to the Agency OS colour',
    await callerIp(),
  );
  refresh(slug);
  return { done: Date.now() };
}

export async function uploadLogoAction(
  slug: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const file = form.get('logo');
  if (!(file instanceof File) || file.size === 0)
    return { errors: { logo: 'Choose a PNG or JPEG file.' } };
  const checked = await checkLogo(file);
  if (!checked.ok) return { errors: checked.errors };
  await saveLogo({ url: checked.value.dataUrl, name: checked.value.name });
  audit('branding.saved', 'Logo', checked.value.name, await callerIp());
  refresh(slug);
  return { done: Date.now() };
}

export async function removeLogoAction(slug: string): Promise<void> {
  await saveLogo(null);
  audit('branding.saved', 'Logo', 'Removed', await callerIp());
  refresh(slug);
}
