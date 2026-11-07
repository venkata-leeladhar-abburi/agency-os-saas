'use client';

import { Textarea } from '@agency-os/ui';
import { useActionState } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import type { Fields } from '@/lib/forms';
import { postUpdateAction } from './actions';

export function DailyUpdateForm({ slug, values }: { slug: string; values: Fields }) {
  const [state, action] = useActionState(postUpdateAction.bind(null, slug), EMPTY_FORM);
  const v = state.values ?? values;
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-3" noValidate>
      <Textarea
        label="Done"
        name="done"
        rows={2}
        defaultValue={v.done}
        error={e.done}
        placeholder="e.g. Homepage hero, both options"
      />
      <Textarea label="Next" name="next" rows={2} defaultValue={v.next} error={e.next} />
      <Textarea
        label="Blockers"
        name="blockers"
        optional
        rows={2}
        defaultValue={v.blockers}
        error={e.blockers}
      />
      <div className="flex items-center justify-end gap-3">
        {state.done ? (
          <p role="status" className="text-body-sm text-muted-foreground">
            Update posted.
          </p>
        ) : null}
        <Submit variant="secondary">
          {values.done || values.next ? 'Update my day' : 'Post my update'}
        </Submit>
      </div>
    </form>
  );
}
