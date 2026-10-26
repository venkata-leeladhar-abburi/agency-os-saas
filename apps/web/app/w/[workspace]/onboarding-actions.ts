'use server';

import { revalidatePath } from 'next/cache';
import {
  dismissOnboarding,
  loadExampleData,
  removeExampleData,
  showOnboarding,
  type RemoveResult,
} from '@/lib/data/onboarding';

export async function dismissOnboardingAction(slug: string) {
  await dismissOnboarding();
  revalidatePath(`/w/${slug}`, 'layout');
}

export async function showOnboardingAction(slug: string) {
  await showOnboarding();
  revalidatePath(`/w/${slug}`, 'layout');
}

export async function removeExampleAction(slug: string): Promise<RemoveResult> {
  const result = await removeExampleData();
  revalidatePath(`/w/${slug}`, 'layout');
  return result;
}

export async function loadExampleAction(slug: string) {
  await loadExampleData();
  revalidatePath(`/w/${slug}`, 'layout');
}
