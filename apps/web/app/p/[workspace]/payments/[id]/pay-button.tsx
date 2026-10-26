'use client';

import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { payAction } from '../../actions';

export function PayButton({ slug, id, label }: { slug: string; id: string; label: string }) {
  const [state, action] = useActionState(async () => payAction(slug, id), EMPTY_FORM);
  return (
    <form action={action} className="grid gap-3">
      <FormMessage state={state} title="The payment didn’t go through" />
      <Submit size="xl" block>
        {label}
      </Submit>
    </form>
  );
}
