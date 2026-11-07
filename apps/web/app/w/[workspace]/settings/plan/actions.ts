'use server';

import { PLAN_DETAILS, PLANS, type Plan } from '@agency-os/core';
import { revalidatePath } from 'next/cache';
import { exampleMode } from '@/lib/data';
import { audit } from '@/lib/data/audit';
import { setPlan } from '@/lib/data/plan';
import type { FormState } from '@/lib/form-state';
import { callerIp } from '@/lib/origin';

/**
 * Example mode only: switch plans without paying, to try the limits. Real changes go through
 * Razorpay subscriptions once the test keys are set (M6 part 2).
 */
export async function switchPlanAction(slug: string, plan: Plan): Promise<FormState> {
  if (!exampleMode())
    return { message: 'Changing plans needs Razorpay, which isn’t connected yet.' };
  if (!PLANS.includes(plan) || !PLAN_DETAILS[plan].offered)
    return { message: 'Pick one of the plans shown.' };
  await setPlan(plan);
  audit('plan.changed', PLAN_DETAILS[plan].name, 'Example mode: no payment', await callerIp());
  revalidatePath(`/w/${slug}`, 'layout');
  return { done: Date.now() };
}
