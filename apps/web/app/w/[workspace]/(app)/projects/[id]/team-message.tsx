'use client';

import { Textarea } from '@agency-os/ui';
import { useActionState, useEffect, useRef } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { teamMessageAction } from '../actions';

export function TeamMessageForm({ slug, id }: { slug: string; id: string }) {
  const [state, action] = useActionState(teamMessageAction.bind(null, slug, id), EMPTY_FORM);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);
  return (
    <form ref={form} action={action} className="grid gap-2" noValidate>
      <Textarea
        label="Reply"
        name="text"
        rows={2}
        defaultValue={state.values?.text}
        error={state.errors?.text}
        hint="The client sees it in their portal."
      />
      <div>
        <Submit variant="secondary" size="sm">
          Send reply
        </Submit>
      </div>
    </form>
  );
}
