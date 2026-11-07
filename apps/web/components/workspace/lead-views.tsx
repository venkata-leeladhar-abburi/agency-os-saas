'use client';

import { FloppyDisk } from '@phosphor-icons/react';
import { Input } from '@agency-os/ui';
import { useActionState, useEffect, useRef } from 'react';
import type { FormState } from '@/lib/form-state';
import { FormMessage, Submit } from './form-bits';

/** Saves the leads page's current filters under a name. */
export function SaveViewForm({
  action,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, run] = useActionState<FormState, FormData>(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);
  return (
    <form ref={form} action={run} className="grid gap-2">
      {state.message ? <FormMessage state={state} title="The view wasn’t saved" /> : null}
      <div className="flex flex-wrap items-end gap-2">
        <Input
          name="name"
          label="Save these filters as"
          placeholder="Referrals to follow up"
          maxLength={60}
          required
          defaultValue={state.values?.name}
          error={state.errors?.name}
          containerClassName="min-w-0 flex-1 basis-56"
        />
        <Submit variant="secondary">
          <FloppyDisk size={16} aria-hidden="true" /> Save view
        </Submit>
      </div>
      {state.done ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          Saved. It’s in your saved views.
        </p>
      ) : null}
    </form>
  );
}

/**
 * Remembers the filters on this page in a cookie for next time (D-066), or forgets them when
 * the page shows everything. The page reads it back when it opens without filters.
 */
export function RememberFilter({
  name,
  path,
  query,
}: {
  name: string;
  path: string;
  query: string;
}) {
  useEffect(() => {
    document.cookie = query
      ? `${name}=${encodeURIComponent(query)}; path=${path}; max-age=15552000; samesite=lax`
      : `${name}=; path=${path}; max-age=0; samesite=lax`;
  }, [name, path, query]);
  return null;
}
