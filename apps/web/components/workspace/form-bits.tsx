'use client';

import { EnvelopeSimple, SealCheck } from '@phosphor-icons/react';
import { Alert, Button, type ButtonProps } from '@agency-os/ui';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/form-state';

// By name, so server pages can choose one (components can't cross to the client).
const ICONS = { won: SealCheck, invite: EnvelopeSimple };

/** A submit button that shows a spinner while its form is saving. */
export function Submit({
  children,
  variant = 'primary',
  icon,
  ...props
}: Omit<ButtonProps, 'type' | 'loading' | 'icon'> & { icon?: keyof typeof ICONS }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      icon={icon ? ICONS[icon] : undefined}
      loading={pending}
      {...props}
    >
      {children}
    </Button>
  );
}

/** The form-level message, when there is one. */
export function FormMessage({ state, title }: { state: FormState; title: string }) {
  if (!state.message && !(state.errors && Object.keys(state.errors).length)) return null;
  return (
    <Alert tone="danger" title={title}>
      {state.message ?? 'Fix the fields marked below, then try again.'}
    </Alert>
  );
}
