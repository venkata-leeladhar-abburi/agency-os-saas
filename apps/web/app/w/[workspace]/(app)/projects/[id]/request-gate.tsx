'use client';

import { Input } from '@agency-os/ui';
import { useActionState } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { requestGateAction } from '../actions';

export function RequestGateForm({
  slug,
  id,
  approver,
  suggestion,
}: {
  slug: string;
  id: string;
  approver: string;
  suggestion: string;
}) {
  const [state, action] = useActionState(requestGateAction.bind(null, slug, id), EMPTY_FORM);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Input
        label="What should the client approve?"
        name="title"
        defaultValue={suggestion}
        error={state.errors?.title}
        hint={`${approver} gets an email and a WhatsApp message with a link.`}
        containerClassName="min-w-64 flex-1"
      />
      <Submit>Request approval</Submit>
    </form>
  );
}
