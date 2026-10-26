/** The onboarding checklist (defaults-and-content.md §5). */
export const ONBOARDING_STEPS = [
  {
    key: 'brand',
    title: 'Add your logo and services',
    hint: 'Clients see them on proposals, invoices and the portal.',
    button: 'Open settings',
  },
  {
    key: 'lead',
    title: 'Add your first lead',
    hint: 'Or load example data to look around.',
    button: 'Add lead',
  },
  { key: 'quote', title: 'Send a quote', hint: 'GST is added for you.', button: 'Create quote' },
  {
    key: 'portal',
    title: 'Invite a client to the portal',
    hint: 'They can approve work and pay from their phone.',
    button: 'Invite client',
  },
  {
    key: 'invoice',
    title: 'Create an invoice',
    hint: 'With a UPI and card payment link.',
    button: 'Create invoice',
  },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key'];

export const EXAMPLE_DATA_BANNER = 'You’re looking at example data.';
export const EXAMPLE_DATA_REMOVE = 'Remove it';

export type OnboardingProgress = {
  steps: ((typeof ONBOARDING_STEPS)[number] & { done: boolean })[];
  done: number;
  total: number;
  complete: boolean;
  /** Shown on Today and the dashboard until complete or dismissed (it comes back from Help). */
  visible: boolean;
};

export function onboardingProgress(
  done: Partial<Record<OnboardingStepKey, boolean>>,
  dismissed = false,
): OnboardingProgress {
  const steps = ONBOARDING_STEPS.map((s) => ({ ...s, done: done[s.key] === true }));
  const count = steps.filter((s) => s.done).length;
  const complete = count === steps.length;
  return { steps, done: count, total: steps.length, complete, visible: !complete && !dismissed };
}
