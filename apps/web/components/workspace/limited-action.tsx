'use client';

import { useActionState } from 'react';
import type { FormState } from '@/lib/form-state';
import { FormMessage, Submit } from './form-bits';
import { PlanLimitDialog } from './plan-limit';

/**
 * A one-button form for an action that adds something the plan limits (a proposal, a client
 * on the portal): it opens the upgrade dialog when there's no room.
 */
export function LimitedActionButton({
  action,
  slug,
  children,
  variant = 'primary',
  size,
  icon,
}: {
  action: () => Promise<FormState>;
  slug: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  icon?: 'won' | 'invite' | 'send';
}) {
  const [state, run] = useActionState<FormState>(action, {});
  return (
    <form action={run}>
      <FormMessage state={state} title="That didn’t work" />
      <PlanLimitDialog limit={state.limit} slug={slug} />
      <Submit variant={variant} size={size} icon={icon}>
        {children}
      </Submit>
    </form>
  );
}
