import { describe, expect, it } from 'vitest';
import { ONBOARDING_STEPS, onboardingProgress } from './onboarding';

describe('onboarding checklist', () => {
  it('has the five default steps', () => {
    expect(ONBOARDING_STEPS.map((s) => s.title)).toEqual([
      'Add your logo and services',
      'Add your first lead',
      'Send a quote',
      'Invite a client to the portal',
      'Create an invoice',
    ]);
  });

  it('shows progress until done or dismissed', () => {
    expect(onboardingProgress({ lead: true, quote: true })).toMatchObject({
      done: 2,
      total: 5,
      complete: false,
      visible: true,
    });
    expect(onboardingProgress({ lead: true }, true)).toMatchObject({
      visible: false,
      complete: false,
    });
    const all = onboardingProgress({
      brand: true,
      lead: true,
      quote: true,
      portal: true,
      invoice: true,
    });
    expect(all).toMatchObject({ done: 5, complete: true, visible: false });
    expect(all.steps.every((s) => s.done)).toBe(true);
  });
});
