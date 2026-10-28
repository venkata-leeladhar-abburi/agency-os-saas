'use server';

import { revalidatePath } from 'next/cache';
import { exampleMode } from '@/lib/data';
import { audit } from '@/lib/data/audit';
import { callerIp } from '@/lib/origin';
import {
  dismissOnboarding,
  loadExampleData,
  removeExampleData,
  showOnboarding,
  type RemoveResult,
} from '@/lib/data/onboarding';

export async function dismissOnboardingAction(slug: string) {
  await dismissOnboarding(slug);
  revalidatePath(`/w/${slug}`, 'layout');
}

export async function showOnboardingAction(slug: string) {
  await showOnboarding(slug);
  revalidatePath(`/w/${slug}`, 'layout');
}

/** Example data lives in the example store; a real workspace doesn't offer it yet (D-057). */
export async function removeExampleAction(slug: string): Promise<RemoveResult> {
  if (!exampleMode()) return { removed: 0, kept: [] };
  const result = await removeExampleData();
  audit(
    'example.removed',
    `${result.removed} records`,
    result.kept.length ? `Kept ${result.kept.join(', ')}` : '',
    await callerIp(),
  );
  revalidatePath(`/w/${slug}`, 'layout');
  return result;
}

export async function loadExampleAction(slug: string) {
  if (!exampleMode()) return;
  await loadExampleData();
  revalidatePath(`/w/${slug}`, 'layout');
}
