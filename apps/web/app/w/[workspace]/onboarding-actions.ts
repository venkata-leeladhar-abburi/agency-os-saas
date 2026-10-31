'use server';

import { AccountError } from '@agency-os/db';
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

/** Removes the example records; on the database it records itself in the audit log. */
export async function removeExampleAction(slug: string): Promise<RemoveResult> {
  let result: RemoveResult;
  try {
    result = await removeExampleData(slug);
  } catch (error) {
    if (error instanceof AccountError) return { removed: 0, kept: [], error: error.message };
    throw error;
  }
  if (exampleMode())
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
  try {
    await loadExampleData(slug);
  } catch (error) {
    // Only owners and admins are offered it; anyone else's attempt changes nothing.
    if (!(error instanceof AccountError)) throw error;
  }
  revalidatePath(`/w/${slug}`, 'layout');
}
