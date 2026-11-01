'use client';

import { LOST_REASON_LABELS, LOST_REASONS } from '@agency-os/core';
import { Button, Dialog, DialogContent, Input, Select, Textarea } from '@agency-os/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useRef } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { addNoteAction, markLostAction, setFollowUpAction } from '../actions';

export function NoteForm({ slug, id }: { slug: string; id: string }) {
  const [state, action] = useActionState(addNoteAction.bind(null, slug, id), EMPTY_FORM);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.done) form.current?.reset();
  }, [state.done]);
  return (
    <form ref={form} action={action} className="grid gap-2">
      <Textarea
        label="Add a note"
        name="note"
        rows={2}
        placeholder="e.g. Called Sarah, she’ll confirm the budget by Friday"
        defaultValue={state.values?.note}
        error={state.errors?.note}
      />
      <div>
        <Submit variant="secondary" size="sm">
          Add note
        </Submit>
      </div>
    </form>
  );
}

export function FollowUpForm({ slug, id, value }: { slug: string; id: string; value: string }) {
  const [state, action] = useActionState(setFollowUpAction.bind(null, slug, id), EMPTY_FORM);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Input
        label="Next follow-up"
        name="followUpOn"
        type="date"
        defaultValue={value}
        error={state.errors?.followUpOn}
        containerClassName="min-w-48 flex-1"
      />
      <Submit variant="secondary">Save follow-up</Submit>
      {state.done ? (
        <p role="status" className="w-full text-caption font-normal text-muted-foreground">
          Follow-up saved.
        </p>
      ) : null}
    </form>
  );
}

/** Asks why the lead was lost. Opens from the button, or when the board sends a card to Lost. */
export function LostDialog({ slug, id, name }: { slug: string; id: string; name: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const open = params.get('lost') === '1';
  const [state, action] = useActionState(markLostAction.bind(null, slug, id), EMPTY_FORM);
  const setOpen = (next: boolean) =>
    router.replace(next ? `${path}?lost=1` : path, { scroll: false });
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mark as lost</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Why was ${name} lost?`}
          description="The reason helps you see patterns in lost deals."
        >
          <form action={action} className="grid gap-4" noValidate>
            <Select
              label="Reason"
              name="reason"
              required
              placeholder="Choose a reason"
              defaultValue={state.values?.reason ?? ''}
              options={LOST_REASONS.map((r) => ({ value: r, label: LOST_REASON_LABELS[r] }))}
              error={state.errors?.reason}
            />
            <Textarea
              label="Note"
              name="note"
              optional
              rows={2}
              defaultValue={state.values?.note}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Submit>Mark as lost</Submit>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
